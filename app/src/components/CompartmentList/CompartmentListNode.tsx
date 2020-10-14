import React from 'react';
import * as _ from 'lodash';

import Checkbox from '@material-ui/core/Checkbox';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';

import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

// eslint-disable-next-line import/no-unresolved
import {CompartmentNode} from "../../models/compartmentTree";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";


export interface CompartmentListNodeProps {
    busy: boolean;
    compartmentNode: CompartmentNode;
    showChildren: boolean;
    skipEmptyChildren: boolean;
    visibleCompartmentIds: Set<number>;

    onToggleCompartmentVisible(compartmentId: number): void;
}

interface CompartmentListNodeState {
    open: boolean;
}

export class CompartmentListNode extends React.Component<CompartmentListNodeProps, CompartmentListNodeState> {
    constructor(props: CompartmentListNodeProps) {
        super(props);

        this.state = {
            open: props.compartmentNode.name === "root",
        }
    }

    private renderChildren(): React.ReactElement[] {
        const children = this.props.compartmentNode.children.sort((a, b) => {
            // leaf nodes go last
            if (a.children.length > 0 && b.children.length === 0) {
                return -1;
            } else if (b.children.length > 0 && a.children.length === 0) {
                return 1;
            }

            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName === bName) {
                return 0;
            }

            return aName < bName ? -1 : 1;
        });

        const compartments: React.ReactElement[] = [];
        children.forEach((child) => {
            if (this.props.skipEmptyChildren && child.nDescendentUnits() === 0) {
                return;
            }

            const props: CompartmentListNodeProps = {
                busy: this.props.busy,
                compartmentNode: child,
                showChildren: this.props.showChildren,
                skipEmptyChildren: this.props.skipEmptyChildren,
                visibleCompartmentIds: this.props.visibleCompartmentIds,
                onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
            }

            compartments.push((
                <ListItem dense key={`compartment-node-${child.id}`}>
                    <CompartmentListNode {...props} />
                </ListItem>
            ));
        });

        return compartments;
        // return children.map((child) => {
        //     const props: CompartmentListNodeProps = {
        //         busy: this.props.busy,
        //         compartmentNode: child,
        //         showChildren: this.props.showChildren,
        //         skipEmptyChildren: this.props.skipEmptyChildren,
        //         visibleCompartmentIds: this.props.visibleCompartmentIds,
        //         onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
        //     }
        //
        //     return (
        //         <ListItem dense key={`compartment-node-${child.id}`}>
        //             <CompartmentListNode {...props} />
        //         </ListItem>
        //     );
        // });
    }

    public render(): React.ReactElement {
        let childList;
        if (this.props.showChildren && this.props.compartmentNode.children.length > 0) {
            childList = (
                <Collapse in={this.state.open}
                          timeout='auto'
                          unmountOnExit
                          style={{ paddingLeft: 2 }}
                          key={`${this.props.compartmentNode.acronym}-children`}>
                    <List>
                        {this.renderChildren()}
                    </List>
                </Collapse>
            );
        } else {
            childList = null;
        }

        let expandIcon = null;
        if (childList) {
            expandIcon = (
                <IconButton onClick={() => {this.setState({ open: ! this.state.open })}}>
                    {this.state.open ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            );
        }

        const nUnits = this.props.compartmentNode.nDescendentUnits();
        const nPenetrations = this.props.compartmentNode.nDescendentPenetrations();

        return (
            <Grid container>
                <Grid item xs={1}>
                    <Checkbox disabled={this.props.busy}
                              edge="start"
                              onChange={() => this.props.onToggleCompartmentVisible(this.props.compartmentNode.id)}
                              checked={this.props.visibleCompartmentIds.has(this.props.compartmentNode.id)}
                              tabIndex={-1}
                              inputProps={{ "aria-labelledby": `compartment-node-${this.props.compartmentNode.id}-select` }}
                    />
                </Grid>
                <Grid item xs={9}>
                    <Typography gutterBottom>
                        {`${this.props.compartmentNode.name} (${nUnits} units/${nPenetrations} penetrations)`}
                    </Typography>
                </Grid>
                <Grid item xs={1}>
                    {expandIcon}
                </Grid>
                <Grid item xs>
                    {childList}
                </Grid>
            </Grid>
        );
    }
}