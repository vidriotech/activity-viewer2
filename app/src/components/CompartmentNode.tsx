import * as React from 'react';
import { Icon, List, SemanticICONS } from 'semantic-ui-react';

import { ICompartmentNode } from '../models/api';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';

export class CompartmentNode {
    public constructor(compartment: ICompartmentNode, toggled: boolean) {
        this.id = compartment.id;
        this.acronym = compartment.acronym;
        this.name = compartment.name;
        this.toggled = toggled;
        this.children = compartment.children.map((child: ICompartmentNode) => 
            new CompartmentNode(child, false)
        );
    }

    id: number;
    acronym: string;
    name: string;
    toggled: boolean;
    children: CompartmentNode[];

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

export interface ICompartmentNodeViewProps {
    compartmentNode: CompartmentNode,
    compartmentOnly: boolean,
    visibleCompartments: ICompartmentView[],
    onSelect(node: CompartmentNode, select: boolean): void,
    onToggle(node: CompartmentNode): void,
}

interface ICompartmentNodeViewState {}

export class CompartmentNodeView extends React.Component<ICompartmentNodeViewProps, ICompartmentNodeViewState> {
    private get IconName(): SemanticICONS {
        if (this.props.compartmentOnly) {
            return "file";
        }

        if (this.props.compartmentNode.toggled) {
            return "folder open";
        }

        return this.props.compartmentNode.children && this.props.compartmentNode.children.length > 0 ? "folder" : "file";
    }

    public render() {
        let items = null;

        if (this.props.compartmentNode.toggled && !this.props.compartmentOnly && this.props.compartmentNode.children.length > 0) {
            items = (
                <List.List>
                    {this.props.compartmentNode.children.map(c => (
                        <CompartmentNodeView key={c.name} compartmentNode={c}
                                             compartmentOnly={this.props.compartmentOnly}
                                             visibleCompartments={this.props.visibleCompartments}
                                             onSelect={this.props.onSelect}
                                             onToggle={this.props.onToggle} />
                    ))}
                </List.List>
            );
        }

        const isSelected = this.props.visibleCompartments.some(c => c.compartment.id === this.props.compartmentNode.compartmentId && c.isVisible);
        if (this.props.compartmentNode.name === 'Frontal pole, layer 6a') {
            console.log(`${this.props.compartmentNode.name} is${isSelected ? '' : ' not'} selected`);
        }

        return (
            <List.Item>
                {<List.Icon name={this.IconName} onClick={() => {if (this.props.onToggle) {this.props.onToggle(this.props.compartmentNode);}}}/>}
                <List.Content>
                    <List.Description onClick={() => this.props.onSelect(this.props.compartmentNode, !isSelected)}>
                        <Icon name={isSelected ? "check square outline" : "square outline"}/>
                        {this.props.compartmentNode.name}
                    </List.Description>
                    {items}
                </List.Content>
            </List.Item>
        );
    }
}