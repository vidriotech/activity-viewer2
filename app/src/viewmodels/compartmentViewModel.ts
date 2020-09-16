export interface CompartmentNodeView {
    acronym: string;
    id: number;
    name: string;
    children: CompartmentNodeView[];
    isVisible: boolean;
    rgbTriplet: [number, number, number];
    structureIdPath: number[];
}
