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
import { CompartmentNodeView } from '../../viewmodels/compartmentViewModel';
// eslint-disable-next-line import/no-unresolved
import {PenetrationData} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";


export interface CompartmentListNodeProps {
    selectedPenetrations: Map<string, Penetration>;
    busy: boolean;
    compartmentNodeView: CompartmentNodeView;
    showChildren: boolean;
    onToggleDescendentVisible(descendentNode: CompartmentNodeView): void;
}

interface CompartmentListNodeState {
    open: boolean;
}

export class CompartmentListNode extends React.Component<CompartmentListNodeProps, CompartmentListNodeState> {
    constructor(props: CompartmentListNodeProps) {
        super(props);

        this.state = {
            open: props.compartmentNodeView.name === "root",
        }
    }

    private handleToggleSelfVisible(): void {
        const copyOfSelf: CompartmentNodeView = _.cloneDeep(this.props.compartmentNodeView);
        copyOfSelf.isVisible = !copyOfSelf.isVisible;

        this.props.onToggleDescendentVisible(copyOfSelf);
    }

    private handleToggleDescendentVisible(descendentNode: CompartmentNodeView): void {
        const children = this.props.compartmentNodeView.children.slice();
        const idx = children.map((child) => child.name).indexOf(descendentNode.name);
        children[idx] = descendentNode;

        const copyOfSelf = _.clone(this.props.compartmentNodeView);
        copyOfSelf.children = children;
        this.props.onToggleDescendentVisible(copyOfSelf);
    }

    public render(): React.ReactElement {
        const children = this.props.showChildren ?
            this.props.compartmentNodeView.children.sort((a, b) => {
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
        }) : [];

        const hasChildren = (children.length > 0);

        const childList = hasChildren ? (
            <Collapse in={this.state.open}
                      timeout='auto'
                      unmountOnExit
                      style={{ paddingLeft: 16 }}
                      key={`${this.props.compartmentNodeView.acronym}-children`}>
                <List>
                    {children.map((child) => (
                        <CompartmentListNode selectedPenetrations={this.props.selectedPenetrations}
                                             busy={this.props.busy}
                                             compartmentNodeView={child}
                                             showChildren={true}
                                             onToggleDescendentVisible={this.handleToggleDescendentVisible.bind(this)} />
                    ))}
                </List>
            </Collapse>
        ) : null;

        let expandIcon = null;
        if (hasChildren) {
            expandIcon = (
                <ListItemSecondaryAction key={`${this.props.compartmentNodeView}-expand`}>
                    <IconButton onClick={() => {this.setState({ open: ! this.state.open })}}>
                        {this.state.open ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </ListItemSecondaryAction>
            );
        }

        let nPenetrations = 0;
        let nPoints = 0;
        this.props.selectedPenetrations.forEach((penetrationData) => {
            let hasContributed = false;
            penetrationData.compartments.forEach((compartment) => {
                if (!compartment) {
                    return;
                }

                if (compartment.name === this.props.compartmentNodeView.name) {
                    if (!hasContributed) {
                        nPenetrations += 1;
                        hasContributed = true;
                    }

                    nPoints += 1;
                }
            });
        });

        return (
            <div>
                <ListItem key={this.props.compartmentNodeView.acronym} >
                    <Checkbox disabled={this.props.busy}
                              edge='start'
                              onChange={this.handleToggleSelfVisible.bind(this)}
                              checked={this.props.compartmentNodeView.isVisible}
                              tabIndex={-1}
                              inputProps={{ 'aria-labelledby': this.props.compartmentNodeView.acronym }}
                    />
                    <ListItemText primary={`${this.props.compartmentNodeView.name} (${nPoints} pts/${nPenetrations} pens)`} />
                    {expandIcon}
                </ListItem>
                {childList}
            </div>
        );
    }
}