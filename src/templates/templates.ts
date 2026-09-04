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
    file: `${import.meta.env.BASE_URL}templates/solar-sigil.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/solar-sigil.png`,
  },
  {
    id: 'runic-array',
    name: 'Runic Array',
    description: 'Cool cyan-to-violet layers forming a multi-tier array.',
    file: `${import.meta.env.BASE_URL}templates/runic-array.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/runic-array.png`,
  },
  {
    id: 'crystal-web',
    name: 'Crystal Web',
    description: 'Five silver rings linked by a dense radial grid.',
    file: `${import.meta.env.BASE_URL}templates/crystal-web.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/crystal-web.png`,
  },
  {
    id: 'arcane-matrix',
    name: 'Arcane Matrix',
    description: 'Two overlapping eight-point stars in rose and violet.',
    file: `${import.meta.env.BASE_URL}templates/arcane-matrix.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/arcane-matrix.png`,
  },
  {
    id: 'void-circle',
    name: 'Void Circle',
    description: 'A single thick white ring with thirty-six tick marks.',
    file: `${import.meta.env.BASE_URL}templates/void-circle.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/void-circle.png`,
  },
]
