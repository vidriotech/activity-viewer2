import React from "react";

import Grid from "@material-ui/core/Grid";


// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../../models/predicateModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";

// eslint-disable-next-line import/no-unresolved
import {FilterForm, FilterFormProps} from "../FilterControls/FilterForm";
import {CompartmentTree} from "../../compartmentTree";
import {PredicateList, PredicateListProps} from "../FilterControls/PredicateList";

export interface QueryPanelProps {
    busy: boolean;
    compartmentTree: CompartmentTree;
    compartmentViewTree: CompartmentNodeView;
    selectedPenetrations: Map<string, Penetration>;

    filterPredicate: Predicate;

    onUpdateFilterPredicate(predicate: Predicate): void;
}

export function QueryPanel(props: QueryPanelProps): React.ReactElement {
    const filterFormProps: FilterFormProps = {
        busy: props.busy,
        compartmentTree: props.compartmentTree,
        compartmentViewTree: props.compartmentViewTree,
        selectedPenetrations: props.selectedPenetrations,

        filterPredicate: props.filterPredicate,

        onUpdateFilterPredicate: props.onUpdateFilterPredicate,
    };

    const predicateListProps: PredicateListProps = {
        busy: props.busy,

        filterPredicate: props.filterPredicate,

        onUpdateFilterPredicate: props.onUpdateFilterPredicate,
    };

    return (
        <Grid container style={{height: 200}}>
            <Grid item xs={12}>
                <FilterForm {...filterFormProps} />
            </Grid>
            <Grid item xs={12}>
                <PredicateList {...predicateListProps} />
            </Grid>
        </Grid>
    );
}
