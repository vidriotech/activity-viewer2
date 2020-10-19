import React from "react";
import * as _ from "lodash";

import Grid from "@material-ui/core/Grid";


// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../../models/predicates";

// eslint-disable-next-line import/no-unresolved
import {FilterForm, FilterFormProps} from "../FilterControls/FilterForm";
// eslint-disable-next-line import/no-unresolved
import {PredicateList, PredicateListProps} from "../FilterControls/PredicateList";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../../models/compartmentTree";
// eslint-disable-next-line import/no-unresolved
import {StatsHistogram, StatsHistogramProps} from "../FilterControls/StatsHistogram";

export interface QueryPanelProps {
    compartmentTree: CompartmentTree;

    selectedPenetrations: Map<string, Penetration>;
    availableStats: Set<string>;
    filterPredicate: Predicate;

    onUpdateFilterPredicate(predicate: Predicate): void;
}

interface QueryPanelState {
    unitStatBounds: [number, number];
    unitStatData: number[];
    unitStatId: string;
}

export class QueryPanel extends React.Component<QueryPanelProps, QueryPanelState> {
    constructor(props: QueryPanelProps) {
        super(props);

        this.state = {
            unitStatBounds: [0, 0],
            unitStatData: [],
            unitStatId: "",
        }
    }

    private handleUpdateStatBounds(bounds: [number, number]): void {
        const min = _.min(this.state.unitStatData);
        const max = _.max(this.state.unitStatData);

        this.setState({
            unitStatBounds: [
                Math.max(min, bounds[0]),
                Math.min(max, bounds[1])
            ]
        });
    }

    public render(): React.ReactElement {
        const filterFormProps: FilterFormProps = {
            compartmentTree: this.props.compartmentTree,
            selectedPenetrations: this.props.selectedPenetrations,
            availableStats: this.props.availableStats,
            filterPredicate: this.props.filterPredicate,
            statsBounds: this.state.unitStatBounds,

            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateSelectedStat: (unitStatId: string, unitStatData: number[]) => {
                const min = _.min(unitStatData);
                const max = _.max(unitStatData);
                this.setState({
                    unitStatBounds: [min, max],
                    unitStatId,
                    unitStatData
                });
            },
            onUpdateStatBounds: this.handleUpdateStatBounds.bind(this)
        };

        let statsHistogram: React.ReactElement = null;
        if (this.state.unitStatId !== "" && this.state.unitStatData.length > 0) {
            const statsHistogramProps: StatsHistogramProps = {
                data: this.state.unitStatData,
                height: 200,
                unitStatId: this.state.unitStatId,
                width: 500,
                filterPredicate: this.props.filterPredicate,
                histBounds: this.state.unitStatBounds,

                onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
                onUpdateStatBounds: this.handleUpdateStatBounds.bind(this)
            }

            statsHistogram = <StatsHistogram {...statsHistogramProps} />;
        }

        const predicateListProps: PredicateListProps = {
            filterPredicate: this.props.filterPredicate,

            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
        };

        return (
            <Grid container style={{height: 300}}>
                <Grid item xs>
                    <FilterForm {...filterFormProps} />
                </Grid>
                <Grid item xs>
                    <PredicateList {...predicateListProps} />
                </Grid>
                <Grid item xs>
                    {statsHistogram}
                </Grid>
            </Grid>
        );
    }
}