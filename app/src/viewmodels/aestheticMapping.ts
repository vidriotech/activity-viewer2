export interface IAestheticMapping {
    timeseriesId: string,
    times: number[],
    values: number[],
}

export interface IAesthetics {
    penetrationId: string,
    color: IAestheticMapping,
    opacity: IAestheticMapping,
    radius: IAestheticMapping,
    visible: number[],
}
