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

import { CompartmentNodeView } from '../../viewmodels/compartmentViewModel';


export interface ICompartmentListNodeProps {
    compartmentNodeView: CompartmentNodeView,
    showChildren: boolean,
    onToggleDescendantVisible(descendentNode: CompartmentNodeView): void,
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
        const copyOfSelf: CompartmentNodeView = _.extend(
            _.pick(this.props.compartmentNodeView,
                _.without(_.keys(this.props.compartmentNodeView), 'isVisible')
            ),
            { isVisible : !this.props.compartmentNodeView.isVisible }
        );

        this.props.onToggleDescendantVisible(copyOfSelf);
    }

    private handleToggleDescendantVisible(descendentNode: CompartmentNodeView) {
        let children = this.props.compartmentNodeView.children.slice();
        const idx = children.map((child) => child.name).indexOf(descendentNode.name);
        children[idx] = descendentNode;

        this.props.onToggleDescendantVisible(_.extend(
            _.pick(this.props.compartmentNodeView, _.without(_.keys(this.props.compartmentNodeView), 'children')),
            { children }
        ));
    }

    public render() {
        const children = this.props.showChildren ?
            this.props.compartmentNodeView.children.sort((a, b) => {
            // leaf nodes go last
            if (a.children.length > 0 && b.children.length === 0) {
                return -1;
            } else if (b.children.length > 0 && a.children.length === 0) {
                return 1;
            }

            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
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
                      style={{ paddingLeft: 12 }}
                      key={`${this.props.compartmentNodeView.acronym}-children`}>
                <List>
                    {children.map((child) => (
                        <CompartmentListNode compartmentNodeView={child}
                                             showChildren={true}
                                             onToggleDescendantVisible={this.handleToggleDescendantVisible.bind(this)} />
                    ))}
                </List>
            </Collapse>
        ) : null;

        let expandIcon = null;
        if (hasChildren) {
            expandIcon = (
                <ListItemSecondaryAction key={`${this.props.compartmentNodeView}-expand`}>
                    <IconButton onClick={this.handleToggleExpand.bind(this)}>
                        {this.state.open ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </ListItemSecondaryAction>
            );
        }

        return (
            <div>
                <ListItem // button
                        //   onClick={this.handleToggleSelfVisible.bind(this)}
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