import React from 'react';
import { List, Container } from 'semantic-ui-react';

import { ICompartmentNode } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';
import { CompartmentNodeView, CompartmentNode } from './CompartmentNode';

export interface ICompartmentProps {
    compartmentTree: CompartmentTree,
    rootNode: CompartmentNode,
    visibleCompartments: ICompartmentView[],
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
}

interface ICompartmentState {
    selectedNode: CompartmentNode,
}

export class Compartments extends React.Component<ICompartmentProps, ICompartmentState> {
    constructor(props: ICompartmentProps) {
        super(props);

        this.state = {
            selectedNode: null
        };
    }

    public onSelect(node: CompartmentNode, selected: boolean) {
        const added = selected ? [node.compartmentName] : [];
        const removed = selected ? [] : [node.compartmentName];

        console.log(added);
        console.log(removed);

        this.props.onUpdateSelectedCompartments(added, removed);
    }

    public onToggle = (node: CompartmentNode) => {
        if (node.children) {
            node.toggled = !node.toggled;
        }

        this.setState({selectedNode: node});
    };

    public render() {
        if (this.props.compartmentTree === null) {
            return null;
        }

        const compartmentNodeViewProps = {
            compartmentNode: this.props.rootNode,
            compartmentOnly: false,
            visibleCompartments: this.props.visibleCompartments,
            onSelect: this.onSelect.bind(this),
            onToggle: this.onToggle.bind(this),
        };

        let list = (
            <List>
                <CompartmentNodeView {...compartmentNodeViewProps} />
            </List>
        );

        return (
            <Container fluid>
                <div style={{padding: '10px' }}>
                    {list}
                </div>
            </Container>
        )
    }
}