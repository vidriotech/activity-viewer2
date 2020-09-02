import React from 'react';
import * as _ from 'lodash';

import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import Container from '@material-ui/core/Container';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';

import DeleteIcon from '@material-ui/icons/Delete';

import { PointModel } from '../../models/pointModel';
import { Predicate, PredicateChain, ANDPredicateChain, ORPredicateChain } from '../../models/predicateModels';
import { Typography } from '@material-ui/core';

export interface IPredicateListNodeProps {
    indexChain: number[],
    level: number,
    predicate: Predicate,
    onDeleteSubpredicate(indexChain: number[]): void,
}

export function PredicateListNode(props: IPredicateListNodeProps) {
    if (props.predicate === null) {
        return null;
    }

    const subPredicates = props.predicate instanceof PredicateChain ?
        props.predicate.split() :
        [props.predicate];

    let listItemContents;

    if (subPredicates.length === 1) {
        listItemContents = <ListItemText>{subPredicates[0].toString()}</ListItemText>;
    } else {
        const subheader = (
            <ListSubheader>
                {props.predicate instanceof ANDPredicateChain ? 'AND' : 'OR'}
            </ListSubheader>
        );
        listItemContents = (
            <List dense
                  subheader={subheader}
                  component={Card} >
                {subPredicates.map((p, idx) => (
                        <PredicateListNode level={props.level + 1}
                                           predicate={p}
                                           indexChain={_.concat(props.indexChain, [idx])}
                                           onDeleteSubpredicate={props.onDeleteSubpredicate} />
                    )
                )}
            </List>
        );
    }

    const itemKey=`predicate-level-${props.level}-idx-${_.join(props.indexChain, '-')}`;
    return (
        <ListItem key={itemKey}>
            {listItemContents}
            <ListItemSecondaryAction key={`${itemKey}-delete`}>
                <IconButton edge='end'
                            aria-label='delete'
                            onClick={() => props.onDeleteSubpredicate(props.indexChain)}>
                    <DeleteIcon />
                </IconButton>
            </ListItemSecondaryAction>
        </ListItem>
    );
}
