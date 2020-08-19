import React from 'react';

import { CompartmentTree } from '../../models/compartmentTree';
import { ICompartmentView } from '../../viewmodels/compartmentViewModel';

import { Compartments } from './Compartments';
import { CompartmentNode } from './CompartmentNode';


export interface ICompartmentListContainerProps {
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    rootNode: CompartmentNode,
    onToggleSubsetOnly(): void,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
}

export function CompartmentListContainer(props: ICompartmentListContainerProps) {
    const compartmentsProps = {
        compartmentTree: props.compartmentTree,
        visibleCompartments: props.visibleCompartments,
        rootNode: props.rootNode,
        onUpdateSelectedCompartments: props.onUpdateSelectedCompartments,
    };

    return (
        <div style={{
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "flex-start",
            alignContent: "flex-start",
            order: 3,
            height: "100%",
            flexGrow: 0,
            flexShrink: 0,
            display: "flex",
        }}>
            <Compartments {...compartmentsProps} />
        </div>
    )
}

