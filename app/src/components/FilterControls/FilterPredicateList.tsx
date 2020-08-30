import React from 'react';

import Container from '@material-ui/core/Container';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';

import DeleteIcon from '@material-ui/icons/Delete';

import { IFilterCondition } from '../../models/filter';


export interface IFilterPredicateListProps {
    filterConditions: IFilterCondition[],
}

interface IFilterPredicateListState {
    
}

export class FilterPredicateList extends React.Component<IFilterPredicateListProps, IFilterPredicateListState> {
    public render() {
        const filterPredicateList = this.props.filterConditions.map((condition, idx) => (
            <ListItem key={idx}>
                <ListItemText primary={
                    `${idx > 0 ? condition.booleanOp : ''} ` + (
                        condition.valType === 'stat' ?
                        `${condition.negate ? '!' : ''}(${condition.greaterThan} <= ${condition.key} <= ${condition.lessThan})` :
                        `${condition.key} ${condition.negate ? '!=' : '=='} ${condition.equals}`
                )} />
                <ListItemSecondaryAction>
                    <IconButton edge='end' aria-label='delete'>
                        <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        ));
    
        return (
            <Container>
                <Typography variant='h5' gutterBottom>
                    Filter predicates
                </Typography>
                <List dense>
                    {filterPredicateList}
                </List>
            </Container>
        );
    }
}