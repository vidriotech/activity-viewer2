import React, {ChangeEvent} from "react";
import * as _ from "lodash";

import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import FormHelperText from "@material-ui/core/FormHelperText";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";

// eslint-disable-next-line import/no-unresolved
import {Predicate, PropEqPredicate, StatPredicate, SubcompartmentPredicate} from "../../models/predicates";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {UnitModel} from "../../models/unitModel";

import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Container from "@material-ui/core/Container";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
// eslint-disable-next-line import/no-unresolved
import {StatsHistogramProps} from "./StatsHistogram";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../../models/compartmentTree";

export interface FilterFormProps {
    compartmentTree: CompartmentTree;

    selectedPenetrations: Map<string, Penetration>;
    availableStats: Set<string>;
    filterPredicate: Predicate;

    onUpdateFilterPredicate(predicate: Predicate): void;
}

interface FilterFormState {
    strEqualsValue: string;
    strNotEqualsValue: string;
    strSubsetEqualsValue: string;
    statLowerBound: number;
    statUpperBound: number;

    currentCondition: string;

    loadProgress: number;
}

export class FilterForm extends React.Component<FilterFormProps, FilterFormState> {
    private propKeys: Map<string, keyof UnitModel>;

    constructor(props: FilterFormProps) {
        super(props);

        this.state = {
            strEqualsValue: "",
            strNotEqualsValue: "",
            strSubsetEqualsValue: "",
            statLowerBound: -Infinity,
            statUpperBound: Infinity,

            currentCondition: "penetration-id",

            loadProgress: 1,
        }

        this.propKeys = new Map<string, keyof UnitModel>();
        this.propKeys.set("compartment-name", "compartmentName");
        this.propKeys.set("penetration-id", "penetrationId");
    }

    private fetchAndUpdateStat(unitStatId: string): void {
        let c = 0;

        this.props.selectedPenetrations.forEach((penetration) => {
            penetration.getUnitStat(unitStatId)
                .then(() => {
                    if (unitStatId === this.state.currentCondition) {
                        c += 1;
                        let progress = c / this.props.selectedPenetrations.size;
                        if (Math.abs(progress - 1) < 1e-15) {
                            progress = 1;
                        }
                        this.setState({loadProgress: progress});
                    }
                });
        });
    }

    private handleClickFilter(op?: "AND" | "OR"): void {
        const isPropCondition = _.includes([
            "penetration-id",
            "compartment-name"
        ], this.state.currentCondition);

        let predicate: Predicate;

        if (isPropCondition) {
            if (this.state.strSubsetEqualsValue !== "") {
                const compartmentNode = this.props.compartmentTree.getCompartmentNodeByName(this.state.strSubsetEqualsValue);
                predicate = new SubcompartmentPredicate(compartmentNode);
            } else {
                const propValue = this.state.strNotEqualsValue === "" ?
                    this.state.strEqualsValue :
                    this.state.strNotEqualsValue;

                const negate = this.state.strNotEqualsValue !== "";
                predicate = new PropEqPredicate(this.propKeys.get(this.state.currentCondition), propValue, negate);
            }
        } else { // stat predicate
            const lowerBound = Number.isNaN(this.state.statLowerBound) ? -Infinity : this.state.statLowerBound;
            const upperBound = Number.isNaN(this.state.statUpperBound) ? Infinity : this.state.statUpperBound;

            predicate = new StatPredicate(this.state.currentCondition, lowerBound, upperBound);
        }

        if ((this.props.filterPredicate !== null) && (op === "AND")) {
            predicate = this.props.filterPredicate.and(predicate);
        } else if (this.props.filterPredicate !== null) { // op === 'OR'
            predicate = this.props.filterPredicate.or(predicate);
        }

        this.resetForm();
        this.props.onUpdateFilterPredicate(predicate);
    }

    private handleUpdatePropField(
        key: "strEqualsValue" | "strNotEqualsValue" | "strSubsetEqualsValue",
        value: string
    ): void {
        const newState = {
            strEqualsValue: this.state.strEqualsValue,
            strNotEqualsValue: this.state.strNotEqualsValue,
            strSubsetEqualsValue: this.state.strSubsetEqualsValue,
        };
        newState[key] = value === null ? "" : value;

        const otherKeys = _.difference(
            ["strEqualsValue", "strNotEqualsValue", "strSubsetEqualsValue"],
            [key]
        );
        otherKeys.forEach((otherKey: "strEqualsValue" | "strNotEqualsValue" | "strSubsetEqualsValue") => {
            if (newState[otherKey] === value) {
                newState[otherKey] = "";
            }
        });

        this.setState(newState);
    }

    private renderAutocomplete(
        key: "strEqualsValue" | "strNotEqualsValue" | "strSubsetEqualsValue"
    ): React.ReactElement {
        const id = `ac-${this.state.currentCondition}-${key.toLowerCase()}`;

        let placeholder: string;
        let helperText: string;
        let disabled: boolean;
        switch (key) {
            case "strEqualsValue":
                placeholder = "=";
                helperText = "Exact value (equal)";
                disabled = this.state.strNotEqualsValue !== "" || this.state.strSubsetEqualsValue !== "";
                break;
            case "strNotEqualsValue":
                placeholder = "≠";
                helperText = "Exact value (not equal)"
                disabled = this.state.strEqualsValue !== "" || this.state.strSubsetEqualsValue !== "";
                break;
            case "strSubsetEqualsValue":
                placeholder = "⊆";
                helperText = "Containing compartment (ancestor)"
                disabled = this.state.strEqualsValue !== "" || this.state.strNotEqualsValue !== "";
                break;
        }

        let options: string[];
        if (this.state.currentCondition === "penetration-id") {
            options = Array.from(this.props.selectedPenetrations.keys());
        } else if (this.state.currentCondition === "compartment-name") {
            options = this.props.compartmentTree.getAllCompartmentNames();
        } else {
            return null;
        }

        return (
            <Autocomplete size="small"
                          disabled={disabled}
                          id={id}
                          options={options}
                          filterSelectedOptions
                          onChange={(_evt, newValue: string): void => {
                              this.handleUpdatePropField(key, newValue);
                          }}
                          value={this.state[key]}
                          renderInput={
                              (params): React.ReactElement => (
                                  <TextField {...params}
                                             fullWidth
                                             helperText={helperText}
                                             variant="outlined"
                                             placeholder={placeholder} />
                              )
                          } />
        );
    }

    private renderFilterButton(): React.ReactElement {
        const disabled = (
            this.state.loadProgress < 1 || (
                this.state.strEqualsValue === "" &&
                this.state.strNotEqualsValue === "" &&
                this.state.strSubsetEqualsValue === "" && (
                    (Number.isNaN(this.state.statLowerBound) && Number.isNaN(this.state.statUpperBound)) ||
                    !(Number.isFinite(this.state.statLowerBound) || Number.isFinite(this.state.statUpperBound))
                )
            )
        );

        let button: React.ReactElement;
        if (this.state.loadProgress < 1) {
            button = <CircularProgress variant="indeterminate" size={25} />;
        } else if (!this.props.filterPredicate) {
            button = (
                <Button color="primary"
                        disabled={disabled}
                        onClick={() => this.handleClickFilter()}>
                    FILTER
                </Button>
            );
        } else {
            button = (
                <ButtonGroup>
                    <Button color="primary"
                            disabled={disabled}
                            onClick={() => this.handleClickFilter("AND")}>
                        AND
                    </Button>
                    <Button color="secondary"
                            disabled={disabled}
                            onClick={() => this.handleClickFilter("OR")}>
                        OR
                    </Button>
                </ButtonGroup>
            );
        }

        return button;
    }

    private renderNumericInput(
        key: "statLowerBound" | "statUpperBound"
    ): React.ReactElement {
        const id = `input-${this.state.currentCondition}-${key.toLowerCase}`;

        let placeholder: string;
        let helperText: string;
        if (key === "statLowerBound") {
            placeholder = "≥";
            helperText = "Lower bound";
        } else if (key === "statUpperBound") {
            placeholder = "≤";
            helperText = "Upper bound";
        }

        return (
            <TextField fullWidth
                       id={id}
                       variant="outlined"
                       placeholder={placeholder}
                       helperText={helperText}
                       type="number"
                       size="small"
                       value={this.state[key]}
                       onChange={(evt) => {
                           const newState = {
                               statLowerBound: this.state.statLowerBound,
                               statUpperBound: this.state.statUpperBound,
                           };
                           newState[key] = Number.parseFloat(evt.target.value);

                           this.setState(newState)
                       }} />
        );
    }

    private resetForm(): void {
        this.setState({
            strEqualsValue: "",
            strNotEqualsValue: "",
            strSubsetEqualsValue: "",
            statLowerBound: -Infinity,
            statUpperBound: Infinity,
        });
    }

    public componentDidUpdate(prevProps: Readonly<FilterFormProps>, prevState: Readonly<FilterFormState>): void {
        if (prevState.currentCondition !== this.state.currentCondition &&
            this.props.availableStats.has(this.state.currentCondition)
        ) {
            this.fetchAndUpdateStat(this.state.currentCondition);
        } else if (this.state.loadProgress < 1 && !this.props.availableStats.has(this.state.currentCondition)) {
            this.setState({loadProgress: 1});
        }
    }

    public render(): React.ReactElement {
        const availableStats = Array.from(this.props.availableStats);
        const isPropCondition = _.includes([
            "penetration-id",
            "compartment-name"
        ], this.state.currentCondition);

        const conditionMenuItems = _.union(
            [
                <MenuItem key="penetration-id" value="penetration-id">
                    Penetration ID
                </MenuItem>,
                <MenuItem key="compartment-name" value="compartment-name">
                    Compartment name
                </MenuItem>
            ],
            availableStats.map((stat) => (
                <MenuItem key={stat} value={stat}>
                    {`Statistic: ${stat}`}
                </MenuItem>
            ))
        );

        let formChildren = [
            <FormControl>
                <Select autoWidth
                        variant="outlined"
                        labelId="filter-form-select-label"
                        id="filter-form-select"
                        value={this.state.currentCondition}
                        onChange={(evt: ChangeEvent<{name?: string; value: string}>): void => {
                            this.setState({currentCondition: evt.target.value}, () => {
                                this.resetForm();
                            });
                        }}
                        style={{height: 40}} >
                    {conditionMenuItems}
                </Select>
                <FormHelperText>Filter selection</FormHelperText>
            </FormControl>
        ];

        if (isPropCondition) {
            formChildren = formChildren.concat(
                [
                    <FormControl>
                        {this.renderAutocomplete("strEqualsValue")}
                    </FormControl>,
                    <FormControl>
                        {this.renderAutocomplete("strNotEqualsValue")}
                    </FormControl>
                ]
            );

            if (this.state.currentCondition === "compartment-name") {
                formChildren.push(
                    <FormControl>
                        {this.renderAutocomplete("strSubsetEqualsValue")}
                    </FormControl>
                );
            }
        } else {
            formChildren = formChildren.concat(
                [
                    <FormControl>
                        {this.renderNumericInput("statLowerBound")}
                    </FormControl>,
                    <FormControl>
                        {this.renderNumericInput("statUpperBound")}
                    </FormControl>
                ]
            );
        }

        formChildren.push(
            <Grid item xs>
                <FormControl>{this.renderFilterButton()}</FormControl>
            </Grid>
        );

        return (
            <Container disableGutters>
                <FormControl component="fieldset">
                    <FormGroup aria-label="filter-conditions" row>
                        {formChildren}
                    </FormGroup>
                </FormControl>
            </Container>
        );
    }
}
