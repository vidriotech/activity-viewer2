import React from 'react';

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from '../../compartmentTree';
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from '../../constants';

// eslint-disable-next-line import/no-unresolved
import { PenetrationData, AVSettings } from '../../models/apiModels';
// eslint-disable-next-line import/no-unresolved
import { Predicate } from '../../models/predicateModels';

// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from '../../viewmodels/compartmentViewModel';

// eslint-disable-next-line import/no-unresolved
import { PredicateList, PredicateListProps } from './PredicateList';
// eslint-disable-next-line import/no-unresolved
import { StatsHistogram, StatsHistogramProps } from './StatsHistogram';


export interface FilterControlsProps {
    availablePenetrations: PenetrationData[];
    busy: boolean;
    compartmentTree: CompartmentTree;
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    statsData: number[];
    filterPredicate: Predicate;
    selectedStat: string;
    settings: AVSettings;
    onUpdateFilterPredicate(predicate: Predicate, newStat: string): void;
    onStatSelectionChange(event: any): void;
    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void;
}

export function FilterControls(props: FilterControlsProps) {
    const predicateListProps: PredicateListProps = {
        availablePenetrations: props.availablePenetrations,
        busy: props.busy,
        compartmentTree: props.compartmentTree,
        filterPredicate: props.filterPredicate,
        onUpdateFilterPredicate: props.onUpdateFilterPredicate,
    };

    const histogramProps: StatsHistogramProps = {
        availablePenetrations: props.availablePenetrations,
        constants: props.constants,
        data: props.statsData,
        height: 300,
        selectedStat: props.selectedStat,
        statName: props.selectedStat,
        width: 400,
        onUpdateFilterPredicate: props.onUpdateFilterPredicate,
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
