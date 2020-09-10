import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { CompartmentTree } from '../../compartmentTree';
import { AVConstants } from '../../constants';

import { PenetrationData, SettingsData } from '../../models/apiModels';
import { Predicate } from '../../models/predicateModels';

import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { PredicateList, IPredicateListProps } from './PredicateList';
import { StatsHistogram, IStatsHistogramProps } from './StatsHistogram';


export interface IFilterControlsProps {
    availablePenetrations: PenetrationData[],
    compartmentSubsetOnly: boolean,
    compartmentTree: CompartmentTree,
    compartmentViewTree: ICompartmentNodeView,
    constants: AVConstants,
    statsData: number[],
    filterPredicate: Predicate,
    selectedStat: string,
    settings: SettingsData,
    onFilterPredicateUpdate(predicate: Predicate, newStat: string): void,
    onStatSelectionChange(event: any): void,
    onToggleCompartmentVisible(rootNode: ICompartmentNodeView): void,
}

export function FilterControls(props: IFilterControlsProps) {
    const predicateListProps: IPredicateListProps = {
        availablePenetrations: props.availablePenetrations,
        compartmentTree: props.compartmentTree,
        filterPredicate: props.filterPredicate,
        onFilterPredicateUpdate: props.onFilterPredicateUpdate,
    };

    const histogramProps: IStatsHistogramProps = {
        availablePenetrations: props.availablePenetrations,
        constants: props.constants,
        data: props.statsData,
        height: 300,
        selectedStat: props.selectedStat,
        statName: props.selectedStat,
        width: 400,
        onFilterPredicateUpdate: props.onFilterPredicateUpdate,
        onStatSelectionChange: props.onStatSelectionChange,
    }

    return (
        <Grid container
              spacing={1}>
            <Grid item xs={12}>
                <PredicateList {...predicateListProps} />
            </Grid>
            {/* <Grid item xs>
                <StatsHistogram {...histogramProps} />
            </Grid> */}
        </Grid>
    );
}
