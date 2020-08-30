import React from 'react';

import Container from '@material-ui/core/Container';
import Input from '@material-ui/core/Input';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';

import { AVConstants } from '../../constants';

import { ICompartmentNode, ISettingsResponse } from '../../models/apiModels';

import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { CompartmentListNode, ICompartmentListNodeProps } from './CompartmentListNode';


export interface ICompartmentListProps {
    compartmentSubsetOnly: boolean,
    compartmentViewTree: ICompartmentNodeView,
    constants: AVConstants,
    settings: ISettingsResponse,
    onToggleCompartmentVisible(rootNode: ICompartmentNodeView): void,
}

interface ICompartmentListState {
    filterText: string,
}

export class CompartmentList extends React.Component<ICompartmentListProps, ICompartmentListState> {
    constructor(props: ICompartmentListProps) {
        super(props);

        this.state = {
            filterText: '',
        };

        console.log(this.props.compartmentViewTree);
    }

    public render() {
        const compartmentListNodeProps: ICompartmentListNodeProps = {
            compartmentNodeView: this.props.compartmentViewTree,
            onToggleDescendantVisible: this.props.onToggleCompartmentVisible,
        }

        return (
            <Container>
                <Typography variant='h5' gutterBottom>
                    Selected compartments
                </Typography>
                <List dense
                    style={{ width: '100%', maxHeight: 300, overflow: 'auto', position: 'relative' }}>
                    <CompartmentListNode {...compartmentListNodeProps} />
                </List>
            </Container>
        );
    }
}