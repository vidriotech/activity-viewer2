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
import {tab10Blue, tab10Orange} from "../../styles";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";

enum SubsetSelection {
    ALL,
    SELECTED,
    NONEMPTY
}

export interface CompartmentListProps {
    busy: boolean;
    compartmentTree: CompartmentTree;
    settings: AVSettings;

    visibleCompartmentIds: Set<number>;

    onToggleCompartmentVisible(compartmentId: number): void;
}

interface CompartmentListState {
    filteredCompartmentIds: number[];
    subsetSelection: SubsetSelection;
}

export class CompartmentList extends React.Component<CompartmentListProps, CompartmentListState> {
    constructor(props: CompartmentListProps) {
        super(props);

        this.state = {
            filteredCompartmentIds: [],
            subsetSelection: SubsetSelection.ALL,
        };
    }

    private renderCompartmentsFromIdList(ids: number[]): React.ReactElement[] {
        return ids.map((compartmentId) => {
            const node = this.props.compartmentTree.getCompartmentNodeById(compartmentId);

            const props: CompartmentListNodeProps = {
                busy: this.props.busy,
                compartmentNode: node,
                showChildren: false,
                skipEmptyChildren: false,
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

    private renderHeader(): React.ReactElement {
        return (
            <Container disableGutters>
                <Typography component="h5"
                            variant="body1"
                            align="center">
                    Compartment Selection
                </Typography>
                <FormControl fullWidth component="fieldset">
                    {/*<FormLabel component="legend">Subset selection</FormLabel>*/}
                    <RadioGroup row aria-label="subset" name="subset"
                                value={this.state.subsetSelection}
                                onChange={
                                    (event): void => {
                                        this.setState({subsetSelection: Number(event.target.value) as SubsetSelection})
                                    }} >
                        <FormControlLabel
                            value={SubsetSelection.ALL}
                            control={<Radio color="default" />}
                            label="Show all"
                            labelPlacement="bottom"
                        />
                        <FormControlLabel
                            value={SubsetSelection.SELECTED}
                            control={<Radio color="default" />}
                            label="Show selected"
                            labelPlacement="bottom"
                        />
                        <FormControlLabel
                            value={SubsetSelection.NONEMPTY}
                            control={<Radio color="default" />}
                            label="Show nonempty"
                            labelPlacement="bottom"
                        />
                    </RadioGroup>
                </FormControl>
            </Container>
        );
    }

    private renderNonemptyCompartments(): React.ReactElement[] {
        const compartments: React.ReactElement[] = [];
        for (const node of this.props.compartmentTree.getAllCompartmentNodes()) {
            if (node.nDescendentUnits() > 0) {
                const props: CompartmentListNodeProps = {
                    busy: this.props.busy,
                    compartmentNode: node,
                    showChildren: false,
                    skipEmptyChildren: false,
                    visibleCompartmentIds: this.props.visibleCompartmentIds,
                    onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
                };

                compartments.push((
                    <ListItem dense key={`compartment-node-filtered-${node.id}`}>
                        <CompartmentListNode {...props} />
                    </ListItem>
                ));
            }
        }

        return compartments;
    }

    private renderSelectedCompartments(): React.ReactElement[] {
        return this.renderCompartmentsFromIdList(Array.from(this.props.visibleCompartmentIds));
    }

    public render(): React.ReactElement {
        // fill children of list depending on state of filter text or subset selection
        let listChildren;
        if (this.state.filteredCompartmentIds.length > 0) {
            listChildren = this.renderFilteredCompartments();
        } else if (this.state.subsetSelection === SubsetSelection.SELECTED) {
            listChildren = this.renderSelectedCompartments();
        } else {
            const rootNode = this.props.compartmentTree.getCompartmentNodeByName("root")
            const rootNodeProps: CompartmentListNodeProps = {
                busy: this.props.busy,
                compartmentNode: rootNode,
                showChildren: true,
                skipEmptyChildren: this.state.subsetSelection === SubsetSelection.NONEMPTY,
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
                {this.renderHeader()}
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
