import React from 'react';
import * as _ from 'underscore';

import Checkbox from '@material-ui/core/Checkbox';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';

import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';


export interface ICompartmentListNodeProps {
    compartmentNodeView: ICompartmentNodeView,
    onToggleDescendantVisible(descendentNode: ICompartmentNodeView): void,
}

interface ICompartmentListNodeState {
    open: boolean,
}

export class CompartmentListNode extends React.Component<ICompartmentListNodeProps, ICompartmentListNodeState> {
    constructor(props: ICompartmentListNodeProps) {
        super(props);

        this.state = {
            open: false,
        }
    }

    private handleToggleExpand() {
        this.setState({ open: ! this.state.open });
    }

    private handleToggleSelfVisible() {
        const copyOfSelf: ICompartmentNodeView = _.extend(
            _.pick(this.props.compartmentNodeView,
                _.without(_.keys(this.props.compartmentNodeView), 'isVisible')
            ),
            { isVisible : !this.props.compartmentNodeView.isVisible }
        );

        this.props.onToggleDescendantVisible(copyOfSelf);
    }

    private handleToggleDescendantVisible(descendentNode: ICompartmentNodeView) {
        let children = this.props.compartmentNodeView.children.slice();
        const idx = children.map((child) => child.name).indexOf(descendentNode.name);
        children[idx] = descendentNode;

        this.props.onToggleDescendantVisible(_.extend(
            _.pick(this.props.compartmentNodeView, _.without(_.keys(this.props.compartmentNodeView), 'children')),
            { children }
        ));
    }

    public render() {
        const hasChildren = this.props.compartmentNodeView.children.length > 0;

        const childList = hasChildren ? (
            <Collapse in={this.state.open}
                      timeout='auto'
                      unmountOnExit
                      style={{ paddingLeft: 12 }}
                      key={`${this.props.compartmentNodeView.acronym}-children`}>
                <List>
                    {this.props.compartmentNodeView.children.map((child) => (
                        <CompartmentListNode compartmentNodeView={child}
                                             onToggleDescendantVisible={this.handleToggleDescendantVisible.bind(this)} />
                    ))}
                </List>
            </Collapse>
        ) : null;

        let expandIcon = null;
        if (hasChildren) {
            expandIcon = (
                <ListItemSecondaryAction>
                    <IconButton onClick={this.handleToggleExpand.bind(this)}>
                        {this.state.open ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </ListItemSecondaryAction>
            );
        }

        return (
            <div>
            <ListItem button
                      onClick={this.handleToggleSelfVisible.bind(this)}
                      key={this.props.compartmentNodeView.acronym} >
                <Checkbox edge='start'
                          onChange={this.handleToggleSelfVisible.bind(this)}
                          checked={this.props.compartmentNodeView.isVisible}
                          tabIndex={-1}
                          inputProps={{ 'aria-labelledby': this.props.compartmentNodeView.acronym }}
                />
                <ListItemText primary={this.props.compartmentNodeView.name} />
                {expandIcon}
            </ListItem>
            {childList}
            </div>
        );
    }
}