import React from 'react';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';
import { Compartments } from './Compartments';
import { CompartmentNode } from './CompartmentNode';


export interface ICompartmentListContainerProps {
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    rootNode: CompartmentNode,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
}

export function CompartmentListContainer(props: ICompartmentListContainerProps) {
    const compartmentsProps = {
        compartmentTree: props.compartmentTree,
        rootNode: props.rootNode,
        visibleCompartments: props.visibleCompartments,
        onUpdateSelectedCompartments: props.onUpdateSelectedCompartments,
    };

    return (
        <div style={{
            opacity: 1.0,
            flexDirection: "column",
            flexWrap: "nowrap",
            alignItems: "flex-start",
            alignContent: "flex-start",
            order: 3,
            width: "400px",
            height: "100%",
            flexGrow: 0,
            flexShrink: 0,
            display: "flex",
            border: "1px solid"
        }}>
            <Compartments {...compartmentsProps} />
        </div>
    )
}
