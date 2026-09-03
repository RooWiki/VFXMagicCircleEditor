export interface TemplateDefinition {
  id: string
  name: string
  description: string
  file: string
  thumbnail: string
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'solar-sigil',
    name: 'Solar Sigil',
    description: 'Concentric rings in warm orange and gold with radial divisions.',
    file: '/templates/solar-sigil.mce.json',
    thumbnail: '/templates/thumbnails/solar-sigil.png',
  },
  {
    id: 'runic-array',
    name: 'Runic Array',
    description: 'Cool cyan-to-violet layers forming a multi-tier array.',
    file: '/templates/runic-array.mce.json',
    thumbnail: '/templates/thumbnails/runic-array.png',
  },
  {
    id: 'crystal-web',
    name: 'Crystal Web',
    description: 'Five silver rings linked by a dense radial grid.',
    file: '/templates/crystal-web.mce.json',
    thumbnail: '/templates/thumbnails/crystal-web.png',
  },
  {
    id: 'arcane-matrix',
    name: 'Arcane Matrix',
    description: 'Two overlapping eight-point stars in rose and violet.',
    file: '/templates/arcane-matrix.mce.json',
    thumbnail: '/templates/thumbnails/arcane-matrix.png',
  },
  {
    id: 'void-circle',
    name: 'Void Circle',
    description: 'A single thick white ring with thirty-six tick marks.',
    file: '/templates/void-circle.mce.json',
    thumbnail: '/templates/thumbnails/void-circle.png',
  },
]
