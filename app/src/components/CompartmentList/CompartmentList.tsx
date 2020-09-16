import React from 'react';
import * as _ from 'lodash';

import Autocomplete from '@material-ui/lab/Autocomplete';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

import { AVConstants } from '../../constants';
import { AVSettings } from '../../models/apiModels';
import { CompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { CompartmentListNode, ICompartmentListNodeProps } from './CompartmentListNode';


export interface ICompartmentListProps {
    compartmentSubsetOnly: boolean,
    compartmentViewTree: CompartmentNodeView,
    constants: AVConstants,
    settings: AVSettings,
    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void,
}

interface ICompartmentListState {
    filteredCompartments: CompartmentNodeView[],
}

export class CompartmentList extends React.Component<ICompartmentListProps, ICompartmentListState> {
    constructor(props: ICompartmentListProps) {
        super(props);

        this.state = {
            filteredCompartments: [],
        };
    }

    private makeCompartmentIndex() {
        let queue = [this.props.compartmentViewTree];
        let flattenedList = [];

        while (queue.length > 0) {
            let node = queue.splice(0, 1)[0];
            queue = queue.concat(node.children);

            flattenedList.push(node);
        }

        return flattenedList;
    }

    private toggleCompartmentVisible(compartmentNodeView: CompartmentNodeView) {
        let structureIdPath = compartmentNodeView.structureIdPath;
        
        // first structure is always root
        let root = _.cloneDeep(this.props.compartmentViewTree);
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

    public componentDidUpdate(prevProps: Readonly<ICompartmentListProps>) {
        if (prevProps.compartmentViewTree !== this.props.compartmentViewTree && this.state.filteredCompartments.length > 0) {
            let filteredCompartmentNames = this.state.filteredCompartments.map((c) => c.name);
            let filteredCompartments: CompartmentNodeView[] = [];
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

    public render() {
        const compartmentList = this.makeCompartmentIndex();
        const header = (
            <Typography variant='h5' gutterBottom>
                Selected compartments
            </Typography>
        );

        const ac = (
            <Autocomplete multiple
                          id='tags-outlined'
                          options={compartmentList}
                          getOptionLabel={(option) => option.name}
                          filterSelectedOptions
                          onChange={(_evt, newValue: CompartmentNodeView[] ) => this.setState({ filteredCompartments: newValue})}
                          renderInput={(params) => (
                              <TextField {...params}
                                         variant='outlined'
                                         placeholder='Search compartments'
                              />
                          )}
            />);

        // fill children of list depending on state of filter text
        let listChildren;
        if (this.state.filteredCompartments.length > 0) {
            listChildren = (
                this.state.filteredCompartments.map((nodeView) => (
                    <CompartmentListNode compartmentNodeView={nodeView}
                                         showChildren={false}
                                         onToggleDescendantVisible={this.toggleCompartmentVisible.bind(this)} />
                    )
                )
            );
        } else {
            const rootNodeProps: ICompartmentListNodeProps = {
                compartmentNodeView: this.props.compartmentViewTree,
                showChildren: true,
                onToggleDescendantVisible: this.props.onToggleCompartmentVisible,
            };

            listChildren = <CompartmentListNode {...rootNodeProps} />;
        }

        return (
            <Container>
                {header}
                {ac}
                <List dense
                      style={{ width: '100%', maxHeight: 500, overflow: 'auto', position: 'relative' }} >
                    {listChildren}
                </List>
            </Container>
        );
    }
}