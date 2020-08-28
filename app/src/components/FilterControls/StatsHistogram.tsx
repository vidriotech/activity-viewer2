import React from 'react';
import * as _ from 'underscore';
import * as d3 from 'd3';

import Container from '@material-ui/core/Container';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';

import { AVConstants } from '../../constants';
import { IFilterCondition } from '../../models/filter';

export interface IStatsHistogramProps {
    constants: AVConstants
    data: number[],
    height: number,
    statName: string,
    width: number,
    onNewFilterCondition(condition: IFilterCondition): void,
}

interface IStatsHistogramState {
    histBounds: [number, number],
    logScale: boolean,
}

export class StatsHistogram extends React.Component<IStatsHistogramProps, IStatsHistogramState> {
    private histId = 'stats-histogram';

    constructor(props: IStatsHistogramProps) {
        super(props);

        this.state = {
            histBounds: [0, 1],
            logScale: false,
        }
    }

    private clearHistogram() {
        const svgElem = document.getElementById(this.histId);
        while (svgElem.lastChild) {
            svgElem.removeChild(svgElem.lastChild);
        }
    }

    private computeDomain() {
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

    private computeStep() {
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

    private handleBoundsChange(_event: any, newData: [number, number], commit: boolean = false) {
        this.setState({ histBounds: newData }, () => {
            if (commit) {
                this.updateStatFilter();
            }
        });
    }

    private handleLogScaleToggle() {
        this.setState({ logScale: !this.state.logScale }, () => {
            this.setState({ histBounds: this.computeDomain() }, () => {
                this.updateStatFilter();
            })
        });
    }

    private renderHistogram() {
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
                .text(this.props.statName))

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
                d => inBounds(this.state.logScale ? Math.log10(d.x0) : d.x0, this.state.histBounds) ?
                `#${this.props.constants.defaultColor.toString(16).padStart(6, '0')}` :
                `#${this.props.constants.defaultColorFaded.toString(16).padStart(6, '0')}`);
      
        svg.append('g')
            .call(xAxis);
        
        svg.append('g')
            .call(yAxis);
    }

    private transformData() {
        return this.state.logScale ?
            this.props.data.filter(x => x >= 0).map(x => x + 0.001) :
            this.props.data;
    }

    private updateStatFilter() {
        const min = this.state.logScale ? Math.pow(10, this.state.histBounds[0]) : this.state.histBounds[0];
        const max = this.state.logScale ? Math.pow(10, this.state.histBounds[1]) : this.state.histBounds[1];
        let condition: IFilterCondition = {
            booleanOp: 'AND',
            key: this.props.statName,
            valType: 'stat',
            greaterThan: min,
            lessThan: max,
            equals: null,
            negate: false,
        }
        this.props.onNewFilterCondition(condition);
    }

    public componentDidUpdate(prevProps: Readonly<IStatsHistogramProps>) {
        if (prevProps.statName !== this.props.statName) {
            this.setState({ histBounds: this.computeDomain()}, () => {
                this.clearHistogram();
                this.renderHistogram();
            });
        } else {
            this.clearHistogram();
            this.renderHistogram();
        }
    }

    public render() {
        const [ min, max ] = this.computeDomain();
        const step = this.computeStep();
        const disabled = this.props.statName === 'nothing';

        const toStr = (x: number) => (
            this.state.logScale ?
                `1e${x > 0 ? '+' : ''}${x.toFixed(1)}` :
                x.toFixed(2)
        )

        return <Container id='stats-histogram-container'>
            <Grid container
                //   direction='column'
                  spacing={1}>
                <Grid item xs={12}>
                    <svg className='container'
                         id={this.histId}
                         width={this.props.width}
                         height={this.props.height} />
                </Grid>
                {/* <Grid container item xs={2}> */}
                    <Grid item xs={2}>
                        <Typography>
                            {disabled ? '' : toStr(this.state.histBounds[0])}
                        </Typography>
                    </Grid>
                    <Grid item xs={5}>
                        <Slider min={min}
                                max={max}
                                scale={this.state.logScale ? (x) => 10**x : (x) => x}
                                step={step}
                                value={this.state.histBounds}
                                onChange={this.handleBoundsChange.bind(this)}
                                onChangeCommitted={(evt, newData) => this.handleBoundsChange(evt, newData as [number, number], true)}
                                disabled={disabled} />
                    </Grid>
                    <Grid item xs={2}>
                        <Typography>
                            {disabled ? '' : toStr(this.state.histBounds[1])}
                        </Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <FormControlLabel
                            control={
                                <Switch checked={this.state.logScale}
                                        onChange={this.handleLogScaleToggle.bind(this)}
                                        name='switch-logscale' />
                            }
                            label="Log scale"
                            disabled={disabled}
                        />
                    </Grid>
                {/* </Grid> */}
            </Grid>
        </Container>
    }
}