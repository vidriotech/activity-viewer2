import { ICompartmentNode } from './apiModels';

export class CompartmentNode {
    id: number;
    acronym: string;
    name: string;
    toggled: boolean;
    children: CompartmentNode[];

    public constructor(compartment: ICompartmentNode, toggled: boolean) {
        this.id = compartment.id;
        this.acronym = compartment.acronym;
        this.name = compartment.name;
        this.toggled = toggled;
        this.children = compartment.children.map(
            (child: ICompartmentNode) => new CompartmentNode(child, false)
        );
    }

    public matches(name: string): boolean {
        name = name.toLowerCase();
        let matches: boolean = this.name.toLowerCase().includes(name);
        if (!matches) {
            matches = this.acronym.toLowerCase().includes(name);
        }

        return matches;
    }

    public get compartmentId() {
        return this.id;
    }

    public get compartmentName() {
        return this.name;
    }
}
