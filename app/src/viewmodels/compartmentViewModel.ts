import { ICompartment } from '../models/compartmentModel';

export interface ICompartmentView {
    compartment: ICompartment;
    isVisible: boolean;
}
