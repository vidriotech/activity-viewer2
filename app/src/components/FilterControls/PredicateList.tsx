import React from 'react';
import * as _ from 'lodash';

import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

import { CompartmentTree } from '../../compartmentTree';
import { IPenetrationData } from '../../models/apiModels';
import { PointModel } from '../../models/pointModel';
import { Predicate, PropPredicate, StatPredicate, PredicateChain, ANDPredicateChain, ORPredicateChain, FuzzyPredicate } from '../../models/predicateModels';

import { PredicateListNode } from './PredicateListNode';

export interface IPredicateListProps {
    availablePenetrations: IPenetrationData[],
    compartmentTree: CompartmentTree,
    filterPredicate: Predicate,
    onFilterPredicateUpdate(predicate: Predicate, newStat: string): void,
}

interface IPredicateListState {
    buttonOpen: boolean,
    currentCondition: string,
    eValue: string,
    lowerBound: number,
    neValue: string,
    selectedIndex: number,
    ssValue: string,
    upperBound: number,
}

export class PredicateList extends React.Component<IPredicateListProps, IPredicateListState> {
    private propKeys: Map<string, keyof(PointModel)>;

    constructor(props: IPredicateListProps) {
        super(props);

        this.state = {
            buttonOpen: false,
            currentCondition: 'compartment-name',
            eValue: '',
            lowerBound: -Infinity,
            neValue: '',
            selectedIndex: 0,
            ssValue: '',
            upperBound: Infinity,
        };

        this.propKeys = new Map<string, keyof(PointModel)>();
        this.propKeys.set('compartment-name', 'compartmentName');
        this.propKeys.set('penetration-id', 'penetrationId');
    }

    private handleButtonClick(op: string) {
        const isPropPredicate = _.includes(
            Array.from(this.propKeys.keys()),
            this.state.currentCondition
        );

        let predicate: Predicate;
        if (isPropPredicate) {
            if (this.state.ssValue !== '') {
                let compartment = this.props.compartmentTree.getCompartmentNodeByName(this.state.ssValue);
                predicate = new FuzzyPredicate(compartment);
            } else {
                const propValue = this.state.neValue === '' ?
                this.state.eValue :
                this.state.neValue;

                const negate = this.state.neValue !== '';
                predicate = new PropPredicate(this.propKeys.get(this.state.currentCondition), propValue, negate);
            }
        } else { // stat predicate
            const lowerBound = Number.isNaN(this.state.lowerBound) ? -Infinity : this.state.lowerBound;
            const upperBound = Number.isNaN(this.state.upperBound) ? Infinity : this.state.upperBound;

            predicate = new StatPredicate(this.state.currentCondition, lowerBound, upperBound);
        }

        if ((this.props.filterPredicate !== null) && (op === 'AND')) {
            predicate = this.props.filterPredicate.and(predicate);
        } else if (this.props.filterPredicate !== null) { // op === 'OR'
            predicate = this.props.filterPredicate.or(predicate);
        }

        this.resetForm();
        this.props.onFilterPredicateUpdate(
            predicate,
            isPropPredicate ? 'nothing' : this.state.currentCondition,
        );
    }

    private handleDropdownSelectionChange(newValue: string) {
        this.setState({ currentCondition: newValue }, () => {
            this.resetForm();
        });
    }

    private handleDeleteSubpredicate(indexChain: number[]) {
        if (indexChain.length === 0) { // delete entire filter
            this.props.onFilterPredicateUpdate(null, 'nothing');
        } else {
            const deleteSubpredicate = (predicate: PredicateChain, indexChain: number[]): Predicate => {
                const idx = indexChain[0];
                indexChain = indexChain.slice(1);
                let subpredicates = predicate.split();

                // base case: index refers to item to remove
                if (indexChain.length === 0) {
                    subpredicates = _.concat(
                        subpredicates.slice(0, idx),
                        subpredicates.slice(idx + 1),
                    );

                    if (subpredicates.length > 1 && predicate instanceof ANDPredicateChain) {
                        return new ANDPredicateChain(...subpredicates);
                    } else if (subpredicates.length > 1) {
                        return new ORPredicateChain(...subpredicates);
                    } else {
                        return subpredicates[0];
                    }
                }

                let alteredPredicate = deleteSubpredicate(subpredicates[idx] as PredicateChain, indexChain);
                subpredicates = _.concat(
                    subpredicates.slice(0, idx),
                    subpredicates.slice(idx + 1)
                );

                if (predicate instanceof ANDPredicateChain) {
                    return (new ANDPredicateChain(...subpredicates)).and(alteredPredicate);
                } else {
                    return (new ORPredicateChain(...subpredicates)).or(alteredPredicate);
                }
            };

            let predicate = deleteSubpredicate(
                this.props.filterPredicate as PredicateChain,
                _.clone(indexChain)
            );

            this.props.onFilterPredicateUpdate(predicate, 'nothing');
        }
    }

    private renderNewFilterForm() {
        const availableStats = _.union(...this.props.availablePenetrations.map(pen => pen.unitStats));
        const isPropPredicate = _.includes(
            Array.from(this.propKeys.keys()),
            this.state.currentCondition
        );

        let entryFields = [
            <Grid item>
                <Select autoWidth
                        variant='outlined'
                        labelId='new-filter-form-select-label'
                        id='new-filter-form-select'
                        value={this.state.currentCondition}
                        onChange={(evt) => this.handleDropdownSelectionChange(evt.target.value as string)}>
                    {_.union(
                        [
                            <MenuItem key='compartment-name' value='compartment-name'>
                                Compartment name
                            </MenuItem>,
                            <MenuItem key='penetration-id' value='penetration-id'>
                                Penetration ID
                            </MenuItem>,
                        ],
                        availableStats.map((stat) => (
                            <MenuItem key={stat}
                                    value={stat}>
                                {`Statistic: ${stat}`}
                            </MenuItem>)
                        ),
                    )}
                </Select>
            </Grid>,
        ];

        if (isPropPredicate) {
            const label = this.state.currentCondition === 'compartment-name' ? 'compartment name' : 'penetration ID';

            entryFields = entryFields.concat([
                <Grid item>
                    <TextField id='new-filter-form-eq-input'
                               variant='outlined'
                               placeholder='='
                               helperText={`Exact ${label}`}
                               value={this.state.eValue}
                               disabled={this.state.neValue !== '' || this.state.ssValue !== ''}
                               onChange={(evt) => this.setState({ eValue: evt.target.value as string })} />
                </Grid>,
                <Grid item>
                    <TextField id='new-filter-form-ne-input'
                               variant='outlined'
                               placeholder='≠'
                               helperText={`Exact ${label}`}
                               value={this.state.neValue}
                               disabled={this.state.eValue !== '' || this.state.ssValue !== ''}
                               onChange={(evt) => this.setState({ neValue: evt.target.value as string })} />
                </Grid>
            ]);
        } else {
            entryFields = entryFields.concat([
                <Grid item>
                    <TextField id='new-filter-form-ge-input'
                               variant='outlined'
                               placeholder='≥'
                               helperText='Lower bound'
                               type='number'
                               value={this.state.lowerBound}
                               disabled={isPropPredicate}
                               onChange={(evt) => this.setState({ lowerBound: Number.parseFloat(evt.target.value) })} />
                </Grid>,
                <Grid item>
                    <TextField id='new-filter-form-ge-input'
                               variant='outlined'
                               placeholder='≤'
                               helperText='Upper bound'
                               type='number'
                               value={this.state.upperBound}
                               disabled={isPropPredicate}
                               onChange={(evt) => this.setState({ upperBound: Number.parseFloat(evt.target.value) })} />
                </Grid>
            ]);
        }

        if (this.state.currentCondition === 'compartment-name') {
            entryFields.push(
                <Grid item>
                    <TextField id='new-filter-form-ss-input'
                               variant='outlined'
                               placeholder='⊆'
                               helperText='Compartment is a child of'
                               value={this.state.ssValue}
                               disabled={this.state.eValue !== '' || this.state.neValue !== ''}
                               onChange={(evt) => this.setState({ ssValue: evt.target.value as string })} />
                </Grid>
            );
        }

        const buttonDisabled = (this.state.eValue === '' &&
            this.state.neValue === '' &&
            this.state.ssValue === '' &&
            (
                (Number.isNaN(this.state.lowerBound) && Number.isNaN(this.state.upperBound)) ||
                !(Number.isFinite(this.state.lowerBound) || Number.isFinite(this.state.upperBound))
            )
        );

        return (
            <Grid container spacing={1}>
                {entryFields}
                <Grid item>
                    {this.props.filterPredicate === null ? (
                            <Button color='primary'
                                    disabled={buttonDisabled}
                                    onClick={() => this.handleButtonClick('')}>
                                FILTER
                            </Button>
                        ) : (
                            <ButtonGroup>
                                <Button color='primary'
                                        disabled={buttonDisabled}
                                        onClick={() => this.handleButtonClick('AND')}>
                                    AND
                                </Button>
                                <Button color='secondary'
                                        disabled={buttonDisabled}
                                        onClick={() => this.handleButtonClick('OR')}>
                                    OR
                                </Button>
                            </ButtonGroup>
                        )}
                </Grid>
            </Grid>
        );
    }

    private resetForm() {
        this.setState({
            eValue: '',
            neValue: '',
            ssValue: '',
            lowerBound: -Infinity,
            upperBound: Infinity
        });
    }

    public render() {
        const predicateString = this.props.filterPredicate === null ?
            '' : this.props.filterPredicate.toString();

        return (
            <Container>
                {this.renderNewFilterForm()}
                <Typography>
                    {`SQL: ${predicateString}`}
                </Typography>
                <List dense
                      style={{ width: '100%', maxHeight: 300, overflow: 'auto', position: 'relative' }} >
                    <PredicateListNode level={0}
                                       predicate={this.props.filterPredicate}
                                       indexChain={[]}
                                       onDeleteSubpredicate={this.handleDeleteSubpredicate.bind(this)} />
                </List>
            </Container>
        );
    }
}
