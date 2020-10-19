import React from 'react';
import * as _ from "lodash";
import * as d3 from 'd3';

import Container from '@material-ui/core/Container';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';

// eslint-disable-next-line import/no-unresolved
import {AVConstants, defaultColorFadedHex, defaultColorHex} from '../../constants';

// eslint-disable-next-line import/no-unresolved
import { Predicate, StatPredicate } from '../../models/predicates';

export interface StatsHistogramProps {
    data: number[];
    height: number;
    unitStatId: string;
    width: number;
    filterPredicate: Predicate;
    histBounds: [number, number];

    onUpdateFilterPredicate(predicate: Predicate): void;
    onUpdateStatBounds(bounds: [number, number]): void;
}

interface StatsHistogramState {
    logScale: boolean;
}

export class StatsHistogram extends React.Component<StatsHistogramProps, StatsHistogramState> {
    private histId = 'stats-histogram';

    constructor(props: StatsHistogramProps) {
        super(props);

        this.state = {
            logScale: false,
        }
    }

    private clearHistogram(): void {
        const svgElem = document.getElementById(this.histId);
        while (svgElem.lastChild) {
            svgElem.removeChild(svgElem.lastChild);
        }
    }

    private computeDomain(): [number, number] {
        const data = this.transformData();

        const x = this.state.logScale? (
            d3.scaleLog()
                .domain(d3.extent(data)).nice()
                .range([0, 1])) : (
            d3.scaleLinear()
                .domain(d3.extent(data)).nice()
                .range([0, 1])
            );

        return x.domain().map(x => this.state.logScale ? Math.log10(x) : x) as [number, number];
    }

    private computeStep(): number {
        const data = this.transformData();
        const x = this.state.logScale? (
            d3.scaleLog()
                .domain(d3.extent(data)).nice()
                .range([0, 1])) : (
            d3.scaleLinear()
                .domain(d3.extent(data)).nice()
                .range([0, 1])
            );

        const domain = x.domain() as [number, number];
        const bins = d3.histogram()
            .domain(domain)
            .thresholds(x.ticks(40))(data);

        return _.min(bins.map(b => b.x1 - b.x0).filter(x => x > 0));
    }

    private handleBoundsChange(_event: any, newData: [number, number]): void {
        if (this.state.logScale) {
            newData = newData.map((x) => Math.pow(10, x)) as [number, number];
        }

        this.props.onUpdateStatBounds(newData);
    }

    private renderHistogram(): void {
        const data = this.transformData();

        if (data.length === 0) {
            return;
        }

        const svg = d3.select(`#${this.histId}`);

        const margin = ({top: 20, right: 20, bottom: 30, left: 40});
        const x = this.state.logScale? (
            d3.scaleLog()
                .domain(d3.extent(data)).nice()
                .range([margin.left, this.props.width - margin.right])) : (
            d3.scaleLinear()
                .domain(d3.extent(data)).nice()
                .range([margin.left, this.props.width - margin.right])
            );

        const domain = x.domain() as [number, number];
        const bins = d3.histogram()
            .domain(domain)
            .thresholds(x.ticks(40))(data);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)]).nice()
            .range([this.props.height - margin.bottom, margin.top])

        const xAxis = (g: any) => g
            .attr('transform', `translate(0,${this.props.height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(this.props.width / 80 ).tickSizeOuter(0))
            .call((g: any) => g.append('text')
                .attr('x', this.props.width - margin.right)
                .attr('y', -4)
                .attr('fill', 'currentColor')
                .attr('font-weight', 'bold')
                .attr('text-anchor', 'end')
                .text(this.props.unitStatId))

        const yAxis = (g: any) => g
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y)
            .ticks(this.props.height / 50))
            .call((g: any) => g.select('.domain').remove())
            .call((g: any) => g.select('.tick:last-of-type text').clone()
                .attr('x', 4)
                .attr('text-anchor', 'start')
                .attr('font-weight', 'bold')
                .text('frequency'))

        const inBounds = (x: number, range: [number, number]) => (range[0] <= x) && (x <= range[1]);
        svg.append('g')
            .selectAll('rect')
            .data(bins)
            .join('rect')
            .attr('x', d => x(d.x0) + 1)
            .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr('y', d => y(d.length))
            .attr('height', d => y(0) - y(d.length))
            .attr('fill',
                d => inBounds(this.state.logScale ? Math.log10(d.x0) : d.x0, this.props.histBounds) ?
                `#${defaultColorHex.toString(16).padStart(6, "0")}` :
                `#${defaultColorFadedHex.toString(16).padStart(6, "0")}`);
      
        svg.append('g')
            .call(xAxis);
        
        svg.append('g')
            .call(yAxis);
    }

    private transformData(): number[] {
        return this.state.logScale ?
            this.props.data.filter(x => x >= 0).map(x => x + 0.001) :
            this.props.data;
    }

    private updateStatFilter(): void {
        const lowerBound = this.state.logScale ? Math.pow(10, this.props.histBounds[0]) : this.props.histBounds[0];
        const upperBound = this.state.logScale ? Math.pow(10, this.props.histBounds[1]) : this.props.histBounds[1];
        let predicate: Predicate = new StatPredicate(this.props.unitStatId, lowerBound, upperBound);

        if (this.props.filterPredicate) {
            const oldPredicate = this.props.filterPredicate;
            if (oldPredicate.filtersOn(this.props.unitStatId)) {
                predicate = predicate.or(this.props.filterPredicate);
            } else {
                predicate = predicate.and(this.props.filterPredicate);
            }
        }

        this.props.onUpdateFilterPredicate(predicate);
    }

    public componentDidMount(): void {
        this.renderHistogram();
    }

    public componentDidUpdate(prevProps: Readonly<StatsHistogramProps>): void {
        this.clearHistogram();
        this.renderHistogram();
    }

    public render(): React.ReactElement {
        const [ min, max ] = this.computeDomain();
        const step = this.computeStep();
        const disabled = this.props.unitStatId === "";

        const sliderMarks = [
            {label: this.props.histBounds[0].toFixed(2), value: this.props.histBounds[0]},
            {label: this.props.histBounds[1].toFixed(2), value: this.props.histBounds[1]},
        ];

        return (
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <svg className='container'
                        id={this.histId}
                        width={this.props.width}
                        height={this.props.height} />
                </Grid>
                <Grid item xs>
                    <Slider min={min}
                            max={max}
                            marks={sliderMarks}
                            scale={(x) => this.state.logScale ? Math.pow(10, x) : x}
                            step={step}
                            value={this.props.histBounds}
                            onChange={this.handleBoundsChange.bind(this)}
                            disabled={disabled} />
                </Grid>
                {/*<Grid item xs>*/}
                {/*    <FormControlLabel*/}
                {/*        control={*/}
                {/*            <Switch checked={this.state.logScale}*/}
                {/*                    onChange={() => this.setState({logScale: !this.state.logScale})}*/}
                {/*                    name='switch-logscale' />*/}
                {/*        }*/}
                {/*        label="Log scale"*/}
                {/*        disabled={disabled}*/}
                {/*    />*/}
                {/*</Grid>*/}
            </Grid>
        );
    }
}