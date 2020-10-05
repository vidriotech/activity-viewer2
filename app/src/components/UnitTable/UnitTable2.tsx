import * as React from 'react';
import * as _ from "lodash";

import { DataGrid, ColDef, ValueGetterParams } from "@material-ui/data-grid";

// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";

interface UnitStatData {
    unitStatId: string;
    unitIds: number[];
    unitStats: number[];
}

export interface UnitTable2Props {
    selectedPenetrations: Map<string, Penetration>;
}

interface UnitTable2State {
    unitStatData: Map<string, UnitStatData[]>;
}

export class UnitTable2 extends React.Component<UnitTable2Props, UnitTable2State> {
    private availableStats: Set<string>;

    constructor(props: UnitTable2Props) {
        super(props);

        this.state = {
            unitStatData: this.populateUnitStatsStub(),
        };

        this.availableStats = new Set<string>();
    }

    private fetchAndUpdateStats(): void {
        this.state.unitStatData.forEach((penetrationStatData, penetrationId) => {
            const penetration = this.props.selectedPenetrations.get(penetrationId);

            penetrationStatData.forEach((statData, idx) => {
                const unitStatId = statData.unitStatId;
                penetration.getUnitStat(unitStatId)
                    .then((stat) => {
                        statData.unitStats = stat;

                        const unitStatsCopy = _.cloneDeep(this.state.unitStatData);
                        unitStatsCopy.get(penetrationId)[idx] = statData;
                        this.setState({unitStatData: unitStatsCopy});
                    });
            });
        });
    }

    private populateUnitStatsStub(): Map<string, UnitStatData[]> {
        this.availableStats = new Set<string>(); // reset stat ids

        // populate stats data with stub objects (populate on mount)
        const unitStats = new Map<string, UnitStatData[]>();
        this.props.selectedPenetrations.forEach((pen, penId) => {
            const statsData: UnitStatData[] = [];
            pen.unitStatIds.forEach((unitStatId) => {
                this.availableStats.add(unitStatId);

                statsData.push({
                    unitStatId: unitStatId,
                    unitIds: pen.getUnitIds(),
                    unitStats: []
                });
            });

            unitStats.set(penId, statsData);
        });

        return unitStats;
    }

    public componentDidMount(): void {
        this.fetchAndUpdateStats();
    }

    public componentDidUpdate(prevProps: Readonly<UnitTable2Props>): void {
        if (prevProps.selectedPenetrations !== this.props.selectedPenetrations) {
            const unitStats = this.populateUnitStatsStub();
            this.setState({unitStatData: unitStats}, () => {
                this.fetchAndUpdateStats();
            });
        }
    }

    public render(): React.ReactElement {
        const columns: ColDef[] = [
            { field: "id", headerName: "ID", width: 70 },
            { field: "penetrationId", headerName: "Penetration ID", width: 130 },
            {
                field: "unitId",
                headerName: "Unit ID",
                type: "number",
                width: 70,
            },
            { field: "compartmentId", headerName: "Compartment ID", width: 200 },
        ];

        this.availableStats.forEach((statId) => {
            columns.push({
                field: statId,
                headerName: statId,
                type: "number",
                width: 130
            });
        });

        let rows: any[] = [];

        let offset = 1;
        this.state.unitStatData.forEach((penetrationStatData, penetrationId) => {
            if (offset > 200) { // TODO: fix performance issues with virtualized table
                return;
            }

            const penetration = this.props.selectedPenetrations.get(penetrationId);
            const unitIds = penetration.getUnitIds();
            const compartmentIds = penetration.getCompartmentIds();

            const penetrationRows: any[] = unitIds.map((uid, idx) => ({
                id: offset + idx,
                penetrationId: penetrationId,
                unitId: uid,
                compartmentId: compartmentIds[idx],
            }));

            penetrationStatData.forEach((unitStatData) => {
                unitStatData.unitIds.forEach((uid, idx) => {
                    penetrationRows[idx].unitId = uid;
                    penetrationRows[idx][unitStatData.unitStatId] = unitStatData.unitStats[idx];
                });
            });

            rows = rows.concat(penetrationRows);
            offset += penetrationRows.length;
        });

        return (
            <div style={{ height: 500, width: "100%" }}>
                <DataGrid rows={rows} columns={columns} pageSize={5} checkboxSelection />
            </div>
        );
    }
}
