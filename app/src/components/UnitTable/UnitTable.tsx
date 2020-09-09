import React from 'react';
import clsx from 'clsx';
import { AutoSizer, Column, Table, TableCellRenderer, TableHeaderProps } from 'react-virtualized';

import { createStyles, Theme, withStyles, WithStyles } from '@material-ui/core/styles';
import IconButtton from '@material-ui/core/IconButton';
import Container from '@material-ui/core/Container';
import TableCell from '@material-ui/core/TableCell';

import SaveIcon from '@material-ui/icons/Save';

import { IPenetrationData } from '../../models/apiModels';

declare module '@material-ui/core/styles/withStyles' {
    // Augment the BaseCSSProperties so that we can control jss-rtl
    interface BaseCSSProperties {
        /*
        * Used to control if the rule-set should be affected by rtl transformation
        */
        flip?: boolean;
    }
}

const styles = (theme: Theme) =>
    createStyles({
        flexContainer: {
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
        },
        table: {
            // temporary right-to-left patch, waiting for
            // https://github.com/bvaughn/react-virtualized/issues/454
            '& .ReactVirtualized__Table__headerRow': {
                flip: false,
                paddingRight: theme.direction === 'rtl' ? '0 !important' : undefined,
            },
        },
        tableRow: {
            cursor: 'pointer',
        },
        tableRowHover: {
            '&:hover': {
                backgroundColor: theme.palette.grey[200],
            },
        },
        tableCell: {
            flex: 1,
        },
        noClick: {
            cursor: 'initial',
        },
    });

interface ColumnData {
    dataKey: string;
    label: string;
    numeric?: boolean;
    width: number;
}

interface Row {
    index: number;
}

interface MuiVirtualizedTableProps extends WithStyles<typeof styles> {
    columns: ColumnData[];
    headerHeight?: number;
    onRowClick?: () => void;
    rowCount: number;
    rowGetter: (row: Row) => UnitData;
    rowHeight?: number;
}

class MuiVirtualizedTable extends React.PureComponent<MuiVirtualizedTableProps> {
    static defaultProps = {
        headerHeight: 48,
        rowHeight: 48,
    };

    getRowClassName = ({ index }: Row) => {
        const { classes, onRowClick } = this.props;

        return clsx(classes.tableRow, classes.flexContainer, {
            [classes.tableRowHover]: index !== -1 && onRowClick != null,
        });
    };

    cellRenderer: TableCellRenderer = ({ cellData, columnIndex }: any) => {
        const { columns, classes, rowHeight, onRowClick } = this.props;

        return (
            <TableCell component='div'
                       className={clsx(classes.tableCell, classes.flexContainer, {
                           [classes.noClick]: onRowClick == null,
                        })}
                       variant='body'
                       style={{ height: rowHeight }}
                       align={(columnIndex != null && columns[columnIndex].numeric) || false ? 'right' : 'left'} >
                {cellData}
            </TableCell>
        );
    };

    headerRenderer = ({ label, columnIndex }: TableHeaderProps & { columnIndex: number }) => {
        const { headerHeight, columns, classes } = this.props;

        return (
            <TableCell component='div'
                       className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
                       variant='head'
                       style={{ height: headerHeight }}
                       align={columns[columnIndex].numeric || false ? 'right' : 'left'} >
                <span>{label}</span>
            </TableCell>
        );
    };

    render() {
        const { classes, columns, rowHeight, headerHeight, ...tableProps } = this.props;

        return (
            <AutoSizer>
                {({ height, width }: any) => (
                <Table height={height}
                       width={width}
                       rowHeight={rowHeight!}
                       gridStyle={{
                           direction: 'inherit',
                       }}
                       headerHeight={headerHeight!}
                       className={classes.table}
                       {...tableProps}
                       rowClassName={this.getRowClassName} >
                    {columns.map(({ dataKey, ...other }, index) => {
                        return (
                            <Column key={dataKey}
                                    headerRenderer={(headerProps: any) =>
                                        this.headerRenderer({
                                            ...headerProps,
                                            columnIndex: index,
                                        })
                                    }
                                className={classes.flexContainer}
                                cellRenderer={this.cellRenderer}
                                dataKey={dataKey}
                                {...other} />
                       );
                    })}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

const VirtualizedTable = withStyles(styles)(MuiVirtualizedTable);

// ---

interface UnitData {
    id: number,
    penetrationId: string,
    unitId: number,
    compartmentName: string,
}

export interface IUnitTableProps {
    availablePenetrations: IPenetrationData[],
    onUnitExportRequest(): void,
}

export function UnitTable(props: IUnitTableProps) {
    const rows: UnitData[] = [];

    let k = 0;
    props.availablePenetrations.forEach((penetrationData, idx) => {
        penetrationData.ids.forEach((id, jdx) => {
            if (penetrationData.compartments[jdx] === null || penetrationData.visible[jdx] === false) {
                return;
            }

            rows.push({
                id: k++,
                penetrationId: penetrationData.penetrationId,
                unitId: id,
                compartmentName: penetrationData.compartments[jdx].acronym,
            });
        })
    });

    return (
        <Container style={{ height: 500, width: '100%' }}>
            <div>
                <IconButtton disabled={props.availablePenetrations.length === 0}
                             onClick={props.onUnitExportRequest} >
                    <SaveIcon></SaveIcon>
                </IconButtton>

            </div>
            <VirtualizedTable rowCount={rows.length}
                            rowGetter={({ index }) => rows[index]}
                            columns={[
                                {
                                    width: 300,
                                    label: 'Penetration',
                                    dataKey: 'penetrationId',
                                },
                                {
                                    width: 60,
                                    label: 'Unit',
                                    dataKey: 'unitId',
                                    numeric: true,
                                },
                                {
                                    width: 120,
                                    label: 'Compartment',
                                    dataKey: 'compartmentName',
                                },
                            ]}/>
        </Container>
    );
}
