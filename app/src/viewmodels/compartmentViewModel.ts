export interface ICompartmentNodeView {
    acronym: string
    id: number,
    name: string,
    children: ICompartmentNodeView[],
    isVisible: boolean,
    rgbTriplet: number[],
    structureIdPath: number[],
}
