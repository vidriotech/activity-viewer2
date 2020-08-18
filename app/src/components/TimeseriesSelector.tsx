import React from 'react';
import { Container, Form, Header, DropdownProps, Grid, Input, InputProps } from 'semantic-ui-react';
import * as _ from 'underscore';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationTimeseriesValuesResponse } from '../models/apiModels';
import { IAestheticMapping } from '../viewmodels/aestheticMapping';

export interface ITimeseriesSelectorProps {
    constants: AVConstants,
    penetrationId: string,
    timeseriesId: string,
    onAestheticChange(aesthetic: string, aestheticMapping: IAestheticMapping): void,
}

interface ITimeseriesSelectorState {
    aesthetic: string,
    dataTimes: number[],
    dataValues: number[],
    stride: number,
    transformMin: number,
    transformMax: number,
}

export class TimeseriesSelector extends React.Component<ITimeseriesSelectorProps, ITimeseriesSelectorState> {
    private apiClient: APIClient;

    constructor(props: ITimeseriesSelectorProps) {
        super(props);

        this.state = {
            aesthetic: 'Radius',
            dataTimes: [],
            dataValues: [],
            stride: 0,
            transformMin: 5,
            transformMax: 500,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private fetchData() {
        this.apiClient.fetchTimeseries(this.props.penetrationId, this.props.timeseriesId)
        .then((res: any) => res.data)
        .then((res: IPenetrationTimeseriesValuesResponse) => {
            const times = res.data.slice(0, res.stride);
            const values = res.data.slice(res.stride);

            this.setState({
                dataTimes: times,
                dataValues: values,
                stride: res.stride
            });
        })
        .then(() => {
            this.propagateAesthetic();
        })
        .catch((err: Error) => {
            console.error(err);
        });
    }

    private handleAestheticSelectionChange(e: React.SyntheticEvent, data: DropdownProps) {
        let transformMin = this.state.transformMin;
        let transformMax = this.state.transformMax;
        const aesthetic = data.value as string;

        switch (aesthetic) {
            case 'Radius':
                transformMin = 5;
                transformMax = 500;
                break;
            case 'Color':
                break;
            case 'Opacity':
                transformMin = 0.01;
                transformMax = 1;                
                break;
            default:
                console.log('default');
        }

        this.setState({
            aesthetic: aesthetic,
            transformMin: transformMin,
            transformMax: transformMax,
        }, () => {
            this.propagateAesthetic();
        });
    }

    private handleMinValueChange(e: any) {
        // if (data.value < this.state.transformMinAllowable
        console.log(e.target.keys());
    }

    private handleMaxValueChange(e: React.SyntheticEvent, data: DropdownProps) {
        // if (data.value < this.state.transformMinAllowable
        console.log(e);
        console.log(data);
    }

    private propagateAesthetic() {
        let mapping: IAestheticMapping = {
            timeseriesId: this.props.timeseriesId,
            times: this.state.dataTimes,
            values: this.transform(),
        }

        this.props.onAestheticChange(this.state.aesthetic.toLowerCase(), mapping);
    }

    private transform() {
        const dataMin = Math.min(...this.state.dataValues);
        const dataRange = Math.max(...this.state.dataValues) - dataMin;
        const transformRange = this.state.transformMax - this.state.transformMin;

        let transformedValues;
        if (dataRange === 0) {
            transformedValues = this.state.dataValues.map(x => transformRange / 2);
        } else {
            transformedValues = this.state.dataValues.map(x =>
                (x - this.state.transformMin)/dataRange * transformRange + this.state.transformMin
            );
        }

        return transformedValues;
    }

    public componentDidMount() {
        this.fetchData();
    }

    public componentDidUpdate(prevProps: Readonly<ITimeseriesSelectorProps>) {
        if (prevProps.penetrationId !== this.props.penetrationId) {     
            this.fetchData();
        }
    }

    public render() {
        const form = (
            <Form>
                <Form.Group widths='equal'>
                    <Form.Dropdown // fluid
                                   defaultValue={this.state.aesthetic}
                                   selection
                                   options={[
                                    {key: 'rad', value: 'Radius', text: 'Radius'},
                                    {key: 'col', value: 'Color', text: 'Color'},
                                    {key: 'opa', value: 'Opacity', text: 'Opacity'},
                                ]}
                                   onChange={this.handleAestheticSelectionChange.bind(this)} />
                    {/* <Form.Input fluid
                                label='Min'
                                type='number'
                                disabled={this.state.aesthetic == 'Color'}
                                // error={{content: `Minimum allowable value is ${this.state.transformMinAllowable}`}}
                                onChange={this.handleMinValueChange.bind(this)}
                                required
                                width={2}
                                />
                    <Form.Input fluid
                                label='Max'
                                type='number'
                                disabled={this.state.aesthetic == 'Color'}
                                // error={{content: `Maximum allowable value is ${this.state.transformMaxAllowable}`}}
                                onChange={this.handleMaxValueChange.bind(this)}
                                required
                                width={2}
                                /> */}
                </Form.Group>
            </Form>
        );
        // const aestheticDropdownOptions = [
        //     {key: 'rad', value: 'Radius', text: 'Radius'},
        //     {key: 'col', value: 'Color', text: 'Color'},
        //     {key: 'opa', value: 'Opacity', text: 'Opacity'},
        // ];
        // const aestheticDropdown = (
        //     <Dropdown defaultValue={this.state.aesthetic}
        //             //   fluid
        //               selection
        //               options={aestheticDropdownOptions}
        //               onChange={this.handleAestheticChange.bind(this)}/>
        // );

        // const minInputProps: InputProps = {
        //     disabled: this.state.aesthetic === 'Color',
        //     // fluid: true,
        //     label: 'Min',
        //     type: 'number',
        //     focus: true,
        //     defaultValue: this.state.transformMinAllowable,
        //     onChange: this.handleMinValueChange.bind(this),
        //     size: 'mini',
        // };

        // const maxInputProps: InputProps = {
        //     disabled: this.state.aesthetic === 'Color',
        //     // fluid: true,
        //     label: 'Max',
        //     type: 'number',
        //     focus: true,
        //     defaultValue: this.state.transformMaxAllowable,
        //     onChange: this.handleMaxValueChange.bind(this),
        //     size: 'mini',
        // };

        // console.log(maxInputProps);

        // let control = <Grid>
        //     <Grid.Row>
        //         {aestheticDropdown}
        //     </Grid.Row>
        //     <Grid.Row>
        //         <Input {...minInputProps}></Input>
        //     </Grid.Row>
        //     <Grid.Row>
        //         <Input {...maxInputProps}></Input>
        //     </Grid.Row>
        // </Grid>;

        return (<Container>
            <Header as='h2'>Aesthetic mapping</Header>
            <p>Using "{this.props.timeseriesId}"</p>
            {form}
        </Container>);
    }
}
