import React from 'react';
import * as _ from 'lodash';

import Autocomplete from '@material-ui/lab/Autocomplete';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from '../../constants';
// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from '../../models/apiModels';
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from '../../viewmodels/compartmentViewModel';

// eslint-disable-next-line import/no-unresolved
import { CompartmentListNode, CompartmentListNodeProps } from './CompartmentListNode';
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";

export interface CompartmentListProps {
    selectedPenetrations: Map<string, Penetration>;
    busy: boolean;
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;

    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void;
}

interface CompartmentListState {
    filteredCompartments: CompartmentNodeView[];
}

export class CompartmentList extends React.Component<CompartmentListProps, CompartmentListState> {
    private availableCompartments: CompartmentNodeView[];

    constructor(props: CompartmentListProps) {
        super(props);

        this.state = {
            filteredCompartments: [],
        };

        this.availableCompartments = [];
    }

    private registerCompartments(): void {
        let queue = [this.props.compartmentViewTree];
        this.availableCompartments = [];

        while (queue.length > 0) {
            const node = queue.splice(0, 1)[0];
            queue = queue.concat(node.children);

            this.availableCompartments.push(node);
        }
    }

    private toggleCompartmentVisible(compartmentNodeView: CompartmentNodeView): void {
        const structureIdPath = compartmentNodeView.structureIdPath;
        
        // first structure is always root
        const root = _.cloneDeep(this.props.compartmentViewTree);
        let cur = root;
        structureIdPath.slice(1).forEach((id) => {
            for (let i = 0; i < cur.children.length; i++) {
                if (cur.children[i].id === id) {
                    cur = cur.children[i];
                    return;
                }
            }
        });

        cur.isVisible = compartmentNodeView.isVisible;
        this.props.onToggleCompartmentVisible(root);
    }

    public componentDidMount(): void {
        this.registerCompartments();
    }

    public componentDidUpdate(prevProps: Readonly<CompartmentListProps>): void {
        if (prevProps.compartmentViewTree !== this.props.compartmentViewTree) {
            this.registerCompartments();

            if (this.state.filteredCompartments.length > 0) {
                const filteredCompartmentNames = this.state.filteredCompartments.map((c) => c.name);
                const filteredCompartments: CompartmentNodeView[] = [];
                let queue = [this.props.compartmentViewTree]

                let node;
                while (queue.length > 0) {
                    node = queue.splice(0, 1)[0];
                    queue = queue.concat(node.children);

                    if (filteredCompartmentNames.includes(node.name)) {
                        filteredCompartments.push(node);
                    }

                    if (filteredCompartments.length === this.state.filteredCompartments.length) {
                        break;
                    }
                }

                this.setState({ filteredCompartments });
            }
        }
    }

    public render(): React.ReactElement {
        const availableCompartments = this.availableCompartments;

        // fill children of list depending on state of filter text
        let listChildren;
        if (this.state.filteredCompartments.length > 0) {
            listChildren = (
                this.state.filteredCompartments.map((nodeView) => (
                    <CompartmentListNode selectedPenetrations={this.props.selectedPenetrations}
                                         busy={this.props.busy}
                                         compartmentNodeView={nodeView}
                                         showChildren={false}
                                         onToggleDescendentVisible={this.toggleCompartmentVisible.bind(this)} />
                    )
                )
            );
        } else {
            const rootNodeProps: CompartmentListNodeProps = {
                selectedPenetrations: this.props.selectedPenetrations,
                busy: this.props.busy,
                compartmentNodeView: this.props.compartmentViewTree,
                showChildren: true,
                onToggleDescendentVisible: this.props.onToggleCompartmentVisible,
            };

            listChildren = <CompartmentListNode {...rootNodeProps} />;
        }

        return (
            <Container>
                <Autocomplete multiple
                              size="small"
                              disabled={this.props.busy}
                              id="ac-compartment-search"
                              options={availableCompartments}
                              getOptionLabel={(option): string => option.name}
                              filterSelectedOptions
                              onChange={(_evt, newValue: CompartmentNodeView[] ) => {
                                  this.setState({filteredCompartments: newValue})
                              }}
                              renderInput={(params): React.ReactElement => (
                                  <TextField {...params}
                                             variant="outlined"
                                             placeholder="Search compartments"
                                  />
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
