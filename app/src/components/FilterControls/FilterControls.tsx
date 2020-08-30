import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { AVConstants } from '../../constants';

import { IPenetrationData, ISettingsResponse } from '../../models/apiModels';
import { IFilterCondition } from '../../models/filter';

import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { CompartmentList, ICompartmentListProps } from './CompartmentList';
import { FilterPredicateList } from './FilterPredicateList';
import { StatsHistogram, IStatsHistogramProps } from './StatsHistogram';


export interface IFilterControlsProps {
    availablePenetrations: IPenetrationData[],
    compartmentSubsetOnly: boolean,
    compartmentViewTree: ICompartmentNodeView,
    constants: AVConstants,
    statsData: number[],
    filterConditions: IFilterCondition[],
    selectedStat: string,
    settings: ISettingsResponse,
    onNewFilterCondition(condition: IFilterCondition): void,
    onStatSelectionChange(event: any): void,
    onToggleCompartmentVisible(rootNode: ICompartmentNodeView): void,
}

export function FilterControls(props: IFilterControlsProps) {
    const compartmentListProps: ICompartmentListProps = {
        compartmentSubsetOnly: props.compartmentSubsetOnly,
        compartmentViewTree: props.compartmentViewTree,
        constants: props.constants,
        settings: props.settings,
        onToggleCompartmentVisible: props.onToggleCompartmentVisible,
    }

    const histogramProps: IStatsHistogramProps = {
        availablePenetrations: props.availablePenetrations,
        constants: props.constants,
        data: props.statsData,
        height: 300,
        selectedStat: props.selectedStat,
        statName: props.selectedStat,
        width: 400,
        onNewFilterCondition: props.onNewFilterCondition,
        onStatSelectionChange: props.onStatSelectionChange,
    }

    return (
        <Grid container
              spacing={1}>
            <Grid item xs>
                <FilterPredicateList filterConditions={props.filterConditions} />
            </Grid>
            <Grid item xs>
                <CompartmentList {...compartmentListProps} />
            </Grid>
            <Grid item xs>
                <StatsHistogram {...histogramProps} />
            </Grid>
        </Grid>
    );
}
