import React from 'react';

import Autocomplete from '@material-ui/lab/Autocomplete';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from '../../models/apiModels';
// eslint-disable-next-line import/no-unresolved
import {CompartmentNode, CompartmentTree} from "../../models/compartmentTree";

// eslint-disable-next-line import/no-unresolved
import { CompartmentListNode, CompartmentListNodeProps } from './CompartmentListNode';
import ListItem from "@material-ui/core/ListItem";

export interface CompartmentListProps {
    busy: boolean;
    compartmentTree: CompartmentTree;
    settings: AVSettings;

    visibleCompartmentIds: Set<number>;

    onToggleCompartmentVisible(compartmentId: number): void;
}

interface CompartmentListState {
    filteredCompartmentIds: number[];
    showSelectedOnly: boolean;
}

export class CompartmentList extends React.Component<CompartmentListProps, CompartmentListState> {
    constructor(props: CompartmentListProps) {
        super(props);

        this.state = {
            filteredCompartmentIds: [],
            showSelectedOnly: false,
        };
    }

    private renderCompartmentsFromIdList(ids: number[]): React.ReactElement[] {
        return ids.map((compartmentId) => {
            const node = this.props.compartmentTree.getCompartmentNodeById(compartmentId);

            const props: CompartmentListNodeProps = {
                busy: this.props.busy,
                compartmentNode: node,
                showChildren: false,
                visibleCompartmentIds: this.props.visibleCompartmentIds,
                onToggleCompartmentVisible: this.props.onToggleCompartmentVisible
            };

            return (
                <ListItem dense key={`compartment-node-filtered-${node.id}`}>
                    <CompartmentListNode {...props} />
                </ListItem>
            );
        });
    }

    private renderFilteredCompartments(): React.ReactElement[] {
        return this.renderCompartmentsFromIdList(this.state.filteredCompartmentIds);
    }

    private renderSelectedCompartments(): React.ReactElement[] {
        return this.renderCompartmentsFromIdList(Array.from(this.props.visibleCompartmentIds));
    }

    public render(): React.ReactElement {
        // fill children of list depending on state of filter text
        let listChildren;
        if (this.state.filteredCompartmentIds.length > 0) {
            listChildren = this.renderFilteredCompartments();
        } else {
            const rootNode = this.props.compartmentTree.getCompartmentNodeByName("root")
            const rootNodeProps: CompartmentListNodeProps = {
                busy: this.props.busy,
                compartmentNode: rootNode,
                showChildren: true,
                visibleCompartmentIds: this.props.visibleCompartmentIds,
                onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
            };

            listChildren = (
                <ListItem dense key={`compartment-node-${rootNode.id}`}>
                    <CompartmentListNode {...rootNodeProps} />
                </ListItem>
            );
        }

        return (
            <Container disableGutters>
                <Autocomplete multiple
                              size="small"
                              disabled={this.props.busy}
                              id="ac-compartment-search"
                              options={Array.from(this.props.compartmentTree.getAllCompartmentNodes())}
                              getOptionLabel={(option): string => option.name}
                              filterSelectedOptions
                              onChange={(_evt, nodes: CompartmentNode[]): void => {
                                  this.setState({
                                      filteredCompartmentIds: nodes.map((node) => node.id)
                                  });
                              }}
                              renderInput={(params): React.ReactElement => (
                                  <TextField {...params}
                                             variant="outlined"
                                             placeholder="Search compartments" />
                              )}
                />
                <List dense
                      style={{ width: "100%", maxHeight: 250, overflow: "auto", position: "relative" }} >
                    {listChildren}
                </List>
            </Container>
        );
    }
}
