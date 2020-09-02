import React from 'react';
import * as _ from 'lodash';

import Autocomplete from '@material-ui/lab/Autocomplete';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

import { AVConstants } from '../../constants';
import { ISettingsResponse } from '../../models/apiModels';
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
    filteredCompartments: ICompartmentNodeView[],
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

    private toggleCompartmentVisible(compartmentNodeView: ICompartmentNodeView) {
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
        console.log(cur);
        console.log(root);
        this.props.onToggleCompartmentVisible(root);
    }

    public componentDidUpdate(prevProps: Readonly<ICompartmentListProps>) {
        if (prevProps.compartmentViewTree !== this.props.compartmentViewTree && this.state.filteredCompartments.length > 0) {
            let filteredCompartmentNames = this.state.filteredCompartments.map((c) => c.name);
            let filteredCompartments: ICompartmentNodeView[] = [];
            let queue = [this.props.compartmentViewTree]

            while (queue.length > 0) {
                const node = queue.splice(0, 1)[0];
                queue = queue.concat(queue, node.children);

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
                          onChange={(_evt, newValue: ICompartmentNodeView[] ) => this.setState({ filteredCompartments: newValue})}
                          renderInput={(params) => (
                              <TextField {...params}
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
                      style={{ width: '100%', maxHeight: 300, overflow: 'auto', position: 'relative' }} >
                    {listChildren}
                </List>
            </Container>
        );
    }
}