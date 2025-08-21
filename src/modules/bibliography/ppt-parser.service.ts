import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';

export interface PptSlideData {
  slideNumber: number;
  title: string;
  content: PptSlideContent[];
  notes: string;
  layout: string;
  slideId: string;
  background: PptBackgroundStyle;
}

export interface PptSlideContent {
  type: 'text' | 'image' | 'shape';
  content: string;
  style: PptTextStyle;
  position?: { x: number; y: number };
}

export interface PptTextStyle {
  fontSize: string;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface PptBackgroundStyle {
  type: 'solid' | 'gradient' | 'pattern' | 'image' | 'none';
  color?: string;
  gradientColors?: string[];
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
  patternType?: string;
  imageUrl?: string;
  transparency?: number;
}

export interface PptMetadata {
  title: string;
  author: string;
  createdDate: Date;
  modifiedDate: Date;
  totalSlides: number;
  subject?: string;
  keywords?: string[];
  theme?: any;
}

export interface PptData {
  totalSlides: number;
  slides: PptSlideData[];
  metadata: PptMetadata;
  slideMapping: Map<number, string>; // slideNumber -> slideId mapping
}

export interface AnchorPointData {
  slideNumber: number;
  slideId: string;
  title: string;
  content: string;
  quizData?: any;
  isActive: boolean;
}

@Injectable()
export class PptParserService {
  private readonly logger = new Logger(PptParserService.name);

  /**
   * Parse PowerPoint file and extract slide information for bibliography
   */
  async parsePptFile(fileBuffer: Buffer): Promise<PptData> {
    try {
      this.logger.log('Starting PPT file parsing...');

      const zip = await JSZip.loadAsync(fileBuffer);
      const slides: PptSlideData[] = [];
      const slideMapping = new Map<number, string>();

      // Get slide files from the zip
      const slideFiles = Object.keys(zip.files).filter(
        (fileName) =>
          fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml'),
      );

      this.logger.log(`Found ${slideFiles.length} slide files`);

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

      for (let i = 0; i < slideFiles.length; i++) {
        const slideContent = await zip.files[slideFiles[i]].async('text');
        const slideData = await this.parseSlideXML(slideContent, i + 1);

        slides.push(slideData);
        slideMapping.set(i + 1, slideData.slideId);

        this.logger.log(`Parsed slide ${i + 1}: ${slideData.title}`);
      }

      const metadata = await this.extractPptMetadata(zip, slides.length);

      return {
        totalSlides: slides.length,
        slides,
        metadata,
        slideMapping,
      };
    } catch (error) {
      this.logger.error(`Failed to parse PPT: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to parse PowerPoint file: ${error.message}`,
      );
    }
  }

  /**
   * Parse individual slide XML content
   */
  private async parseSlideXML(
    xmlContent: string,
    slideNumber: number,
  ): Promise<PptSlideData> {
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });

      const result = await parser.parseStringPromise(xmlContent);

      const slide = result['p:sld'];
      const cSld = slide['p:cSld'];
      const spTree = cSld['p:spTree'];

      let title = '';
      let content: PptSlideContent[] = [];
      let slideId = slide['p:sldId']?.['r:id'] || `slide-${slideNumber}`;

      // Extract background information
      const background = this.extractSlideBackground(cSld);

      if (spTree && spTree['p:sp']) {
        const shapes = Array.isArray(spTree['p:sp'])
          ? spTree['p:sp']
          : [spTree['p:sp']];

        shapes.forEach((shape, index) => {
          const textBody = shape['p:txBody'];
          if (textBody && textBody['a:p']) {
            const paragraphs = Array.isArray(textBody['a:p'])
              ? textBody['a:p']
              : [textBody['a:p']];

            paragraphs.forEach((paragraph) => {
              const text = this.extractTextFromParagraph(paragraph);
              if (text) {
                if (index === 0 && !title) {
                  title = text; // First text is usually title
                } else {
                  content.push({
                    type: 'text',
                    content: text,
                    style: this.extractTextStyle(paragraph),
                    position: this.extractShapePosition(shape),
                  });
                }
              }
            });
          }
        });
      }

      // Extract notes if available
      const notes = await this.extractSlideNotes(xmlContent);

      return {
        slideNumber,
        title: title || `Slide ${slideNumber}`,
        content,
        notes,
        layout: 'standard',
        slideId,
        background,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse slide ${slideNumber}: ${error.message}`,
      );
      return {
        slideNumber,
        title: `Slide ${slideNumber}`,
        content: [],
        notes: '',
        layout: 'standard',
        slideId: `slide-${slideNumber}`,
        background: { type: 'none' },
      };
    }
  }

  /**
   * Extract text content from paragraph
   */
  private extractTextFromParagraph(paragraph: any): string {
    if (!paragraph['a:r']) return '';

    const runs = Array.isArray(paragraph['a:r'])
      ? paragraph['a:r']
      : [paragraph['a:r']];
    return runs.map((run) => run['a:t'] || '').join('');
  }

  /**
   * Extract text styling information
   */
  private extractTextStyle(paragraph: any): PptTextStyle {
    try {
      const run = paragraph['a:r']?.[0] || paragraph['a:r'];
      const rPr = run?.['a:rPr'];

      return {
        fontSize: rPr?.['sz'] ? `${rPr['sz']}pt` : '16pt',
        fontFamily: rPr?.['latin']?.['typeface'] || 'Arial',
        color: this.extractColor(rPr?.['solidFill']),
        bold: rPr?.['b'] === '1',
        italic: rPr?.['i'] === '1',
        alignment: this.extractAlignment(paragraph['a:pPr']?.['a:jc']?.['val']),
      };
    } catch (error) {
      return {
        fontSize: '16pt',
        fontFamily: 'Arial',
        color: '#000000',
        bold: false,
        italic: false,
        alignment: 'left',
      };
    }
  }

  /**
   * Extract color from solid fill
   */
  private extractColor(solidFill: any): string {
    if (!solidFill) return '#000000';

    try {
      const srgbClr = solidFill['a:srgbClr'];
      if (srgbClr?.['val']) {
        return `#${srgbClr['val']}`;
      }
    } catch (error) {
      // Ignore color extraction errors
    }

    return '#000000';
  }

  /**
   * Extract text alignment
   */
  private extractAlignment(
    alignment: any,
  ): 'left' | 'center' | 'right' | 'justify' {
    if (!alignment) return 'left';

    switch (alignment) {
      case 'ctr':
        return 'center';
      case 'r':
        return 'right';
      case 'just':
        return 'justify';
      default:
        return 'left';
    }
  }

  /**
   * Extract shape position
   */
  private extractShapePosition(
    shape: any,
  ): { x: number; y: number } | undefined {
    try {
      const spPr = shape['p:spPr'];
      const xfrm = spPr?.['a:xfrm'];
      const off = xfrm?.['a:off'];

      if (off) {
        return {
          x: parseInt(off['x']) || 0,
          y: parseInt(off['y']) || 0,
        };
      }
    } catch (error) {
      // Ignore position extraction errors
    }

    return undefined;
  }

  /**
   * Extract slide notes
   */
  private async extractSlideNotes(xmlContent: string): Promise<string> {
    try {
      // Look for notes in the XML content
      const notesMatch = xmlContent.match(/<p:notes[^>]*>.*?<\/p:notes>/s);
      if (notesMatch) {
        const notesContent = notesMatch[0];
        // Extract text from notes
        const textMatch = notesContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
        if (textMatch) {
          return textMatch.map((t) => t.replace(/<[^>]*>/g, '')).join(' ');
        }
      }
    } catch (error) {
      // Ignore notes extraction errors
    }

    return '';
  }

  /**
   * Extract slide background information
   */
  private extractSlideBackground(cSld: any): PptBackgroundStyle {
    try {
      // Check for slide background
      const bg = cSld['p:bg'];
      if (!bg) {
        return { type: 'none' };
      }

      // Check for background fill
      const bgPr = bg['p:bgPr'];
      if (!bgPr) {
        return { type: 'none' };
      }

      // Check for solid fill
      const solidFill = bgPr['a:solidFill'];
      if (solidFill) {
        const color = this.extractColor(solidFill);
        return {
          type: 'solid',
          color,
          transparency: this.extractTransparency(bgPr),
        };
      }

      // Check for gradient fill
      const gradFill = bgPr['a:gradFill'];
      if (gradFill) {
        return this.extractGradientFill(gradFill);
      }

      // Check for pattern fill
      const pattFill = bgPr['a:pattFill'];
      if (pattFill) {
        return this.extractPatternFill(pattFill);
      }

      // Check for picture fill (background image)
      const blipFill = bgPr['a:blipFill'];
      if (blipFill) {
        return this.extractPictureFill(blipFill);
      }

      // Check for no fill (transparent background)
      const noFill = bgPr['a:noFill'];
      if (noFill) {
        return { type: 'none' };
      }

      return { type: 'none' };
    } catch (error) {
      this.logger.warn('Failed to extract background:', error.message);
      return { type: 'none' };
    }
  }

  /**
   * Extract gradient fill information
   */
  private extractGradientFill(gradFill: any): PptBackgroundStyle {
    try {
      const gsLst = gradFill['a:gsLst'];
      const gs = gsLst?.['a:gs'];

      if (!gs) {
        return { type: 'none' };
      }

      const stops = Array.isArray(gs) ? gs : [gs];
      const colors = stops
        .map((stop) => {
          const solidFill = stop['a:solidFill'];
          return this.extractColor(solidFill);
        })
        .filter((color) => color !== '#000000');

      // Determine gradient direction
      const lin = gradFill['a:lin'];
      let direction: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal';

      if (lin) {
        const ang = parseInt(lin['ang'] || '0');
        if (ang === 0 || ang === 180) {
          direction = 'horizontal';
        } else if (ang === 90 || ang === 270) {
          direction = 'vertical';
        } else {
          direction = 'diagonal';
        }
      }

      return {
        type: 'gradient',
        gradientColors: colors,
        gradientDirection: direction,
        transparency: this.extractTransparency(gradFill),
      };
    } catch (error) {
      this.logger.warn('Failed to extract gradient fill:', error.message);
      return { type: 'none' };
    }
  }

  /**
   * Extract pattern fill information
   */
  private extractPatternFill(pattFill: any): PptBackgroundStyle {
    try {
      const prst = pattFill['a:prst'];
      const fgClr = pattFill['a:fgClr'];
      const bgClr = pattFill['a:bgClr'];

      const patternType = prst?.['val'] || 'unknown';
      const foregroundColor = fgClr ? this.extractColor(fgClr) : '#000000';
      const backgroundColor = bgClr ? this.extractColor(bgClr) : '#FFFFFF';

      return {
        type: 'pattern',
        patternType,
        color: foregroundColor,
        gradientColors: [foregroundColor, backgroundColor],
        transparency: this.extractTransparency(pattFill),
      };
    } catch (error) {
      this.logger.warn('Failed to extract pattern fill:', error.message);
      return { type: 'none' };
    }
  }

  /**
   * Extract picture fill information
   */
  private extractPictureFill(blipFill: any): PptBackgroundStyle {
    try {
      const blip = blipFill['a:blip'];
      const srcRect = blipFill['a:srcRect'];

      // Extract image reference (this would need to be processed further to get actual image)
      const imageRef = blip?.['r:embed'] || blip?.['r:link'];

      return {
        type: 'image',
        imageUrl: imageRef ? `image-${imageRef}` : undefined,
        transparency: this.extractTransparency(blipFill),
      };
    } catch (error) {
      this.logger.warn('Failed to extract picture fill:', error.message);
      return { type: 'none' };
    }
  }

  /**
   * Extract transparency/alpha value
   */
  private extractTransparency(element: any): number {
    try {
      const alpha = element['a:alpha'];
      if (alpha) {
        const val = parseInt(alpha['val'] || '100000');
        // Convert from 100000 scale to percentage (0-100)
        return Math.round((100000 - val) / 1000);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract PowerPoint metadata
   */
  private async extractPptMetadata(
    zip: JSZip,
    totalSlides: number,
  ): Promise<PptMetadata> {
    try {
      const corePropsFile = zip.files['docProps/core.xml'];
      if (corePropsFile) {
        const content = await corePropsFile.async('text');
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(content);

        const coreProps = result['cp:coreProperties'];

        // Try to extract theme information
        const themeInfo = await this.extractThemeInfo(zip);

        return {
          title: coreProps['dc:title'] || 'Untitled Presentation',
          author: coreProps['dc:creator'] || 'Unknown',
          createdDate: coreProps['dcterms:created']
            ? new Date(coreProps['dcterms:created'])
            : new Date(),
          modifiedDate: coreProps['dcterms:modified']
            ? new Date(coreProps['dcterms:modified'])
            : new Date(),
          totalSlides,
          subject: coreProps['dc:subject'],
          keywords: coreProps['cp:keywords']
            ? coreProps['cp:keywords'].split(',').map((k) => k.trim())
            : [],
          theme: themeInfo,
        };
      }
    } catch (error) {
      this.logger.warn('Could not extract metadata:', error.message);
    }

    return {
      title: 'Untitled Presentation',
      author: 'Unknown',
      createdDate: new Date(),
      modifiedDate: new Date(),
      totalSlides,
      subject: '',
      keywords: [],
      theme: null,
    };
  }

  /**
   * Extract theme information from PowerPoint file
   */
  private async extractThemeInfo(zip: JSZip): Promise<any> {
    try {
      // Check for theme files
      const themeFiles = Object.keys(zip.files).filter(
        (fileName) =>
          fileName.startsWith('ppt/theme/theme') && fileName.endsWith('.xml'),
      );

      if (themeFiles.length === 0) {
        return null;
      }

      // Get the first theme file
      const themeFile = zip.files[themeFiles[0]];
      const content = await themeFile.async('text');
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(content);

      const theme = result['a:theme'];
      if (!theme) {
        return null;
      }

      // Extract color scheme
      const clrScheme = theme['a:clrScheme'];
      const colors: any = {};

      if (clrScheme) {
        const colorElements = [
          'dk1',
          'lt1',
          'dk2',
          'lt2',
          'accent1',
          'accent2',
          'accent3',
          'accent4',
          'accent5',
          'accent6',
        ];
        colorElements.forEach((colorName) => {
          const colorElement = clrScheme[`a:${colorName}`];
          if (colorElement && colorElement['a:srgbClr']) {
            colors[colorName] = `#${colorElement['a:srgbClr']['val']}`;
          }
        });
      }

      return {
        name: theme['a:themeName']?.['a:val'] || 'Default Theme',
        colors,
        hasCustomBackgrounds: themeFiles.length > 1,
      };
    } catch (error) {
      this.logger.warn('Could not extract theme info:', error.message);
      return null;
    }
  }

  /**
   * Generate anchor point data for a specific slide
   */
  generateAnchorPointData(slideData: PptSlideData): AnchorPointData {
    return {
      slideNumber: slideData.slideNumber,
      slideId: slideData.slideId,
      title: slideData.title,
      content: slideData.content.map((item) => item.content).join(' '),
      isActive: true,
    };
  }

  /**
   * Get all potential anchor points from presentation
   */
  getAllAnchorPoints(pptData: PptData): AnchorPointData[] {
    return pptData.slides.map((slide) => this.generateAnchorPointData(slide));
  }

  /**
   * Validate if file is a valid PowerPoint file
   */
  validatePowerPointFile(fileBuffer: Buffer): boolean {
    try {
      // Check for PowerPoint file signature
      const signature = fileBuffer.toString('hex', 0, 8);
      return signature.includes('504b0304'); // ZIP file signature
    } catch (error) {
      return false;
    }
  }
}
