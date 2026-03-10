interface IImageLabeling {
  imageLabeling(
    path: string,
    options?: {
      confidenceThreshold?: number;
    }
  ): Promise<ImageLabel[]>;
}

export type ImageLabel = {
    path: string,
    options?: {
        maxResultCount: number,
        confidenceThreshold: number,
    } 
}

export enum PLASTIC_KEYWORDS  {
  PLASTIC = 'plastic',
  BOTTLE = 'bottle',
  CONTAINER = 'container',
  BAG = 'bag',
  PACKAGE = 'package',
  WRAPPER = 'wrapper',
  CUP = 'cup',
  STRAW = 'straw',
  UTENSIL = 'utensil',
  RECYCLABLE = 'recyclable',
  POLYETHYLENE = 'polyethylene',
  PET = 'pet',
  PVC = 'pvc',
  POLYESTERENE = 'polystyrene'
}

export enum CLASSIFICATION {
  PLASTIC = 'Plastic',
  NONE_PLASTIC = 'Non-plastic'
}

export enum MEDIA_TYPE {
  PHOTO = 'photo'
}

export enum MEDIA_QUYALITY {
  DEFAULT = 1
}

export const BUTTON_LABEL = 'Pick Image & Label';

export enum ActivityIndicatorSize {
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small'
}
