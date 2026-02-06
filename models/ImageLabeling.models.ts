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
