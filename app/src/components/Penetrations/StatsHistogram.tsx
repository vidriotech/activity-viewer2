import React from 'react';

import * as d3 from 'd3';

import Container from '@material-ui/core/Container';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';

export interface IStatsHistogramProps {
    data: number[],
    height: number,
    statName: string,
    width: number,
}

interface IStatsHistogramState {
    logScale: boolean
}

export class StatsHistogram extends React.Component<IStatsHistogramProps, IStatsHistogramState> {
    histId = 'stats-histogram';

    constructor(props: IStatsHistogramProps) {
        super(props);

        this.state = {
            logScale: false,
        }
    }

    private clearHistogram() {
        const svgElem = document.getElementById(this.histId);
        while (svgElem.lastChild) {
            svgElem.removeChild(svgElem.lastChild);
        }
    }

    private handleLogScaleToggle() {
        this.setState({ logScale: !this.state.logScale });
    }

    private renderHistogram() {  
        if (this.props.data.length === 0) {
            return;
        }

        const svg = d3.select(`#${this.histId}`);
        const data = this.state.logScale ? this.props.data.map(x => x + 0.01) : this.props.data;
        // const data = this.props.data;

        const bins = d3.histogram()(data);
        const margin = ({top: 20, right: 20, bottom: 30, left: 40});

        const x = this.state.logScale? (
            d3.scaleLog()
                .domain(d3.extent(data)).nice()
                .range([margin.left, this.props.width - margin.right])) : (
            d3.scaleLinear()
                .domain(d3.extent(data)).nice()
                .range([margin.left, this.props.width - margin.right])
            );

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
            .call(d3.axisLeft(y).ticks(this.props.height / 40))
            .call((g: any) => g.select('.domain').remove())
            .call((g: any) => g.select('.tick:last-of-type text').clone()
                .attr('x', 4)
                .attr('text-anchor', 'start')
                .attr('font-weight', 'bold')
                .text('frequency'))

        svg.append('g')
            .attr('fill', 'steelblue')
            .selectAll('rect')
            .data(bins)
            .join('rect')
            .attr('x', d => x(d.x0) + 1)
            .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr('y', d => { console.log(d); return y(d.length)})
            .attr('height', d => y(0) - y(d.length));
      
        svg.append('g')
            .call(xAxis);
        
        svg.append('g')
            .call(yAxis);
    }
    public componentDidUpdate() {  
        this.clearHistogram();
        this.renderHistogram();
    }

    public render() {
        return <Container id='stats-histogram-container'>
            <Grid container
                  direction='column'
                  spacing={3}>
                <Grid item xs={10}>
                    <svg className='container'
                         id={this.histId}
                         width={this.props.width}
                         height={this.props.height} />
                </Grid>
                <Grid container item>
                    <Grid item>
                    {this.props.data.length > 0 ? <FormControlLabel
                        control={<Switch checked={this.state.logScale} onChange={this.handleLogScaleToggle.bind(this)} name='logscale' />}
                        label="Log scale"
                    /> : null}</Grid>
                </Grid>
            </Grid>
        </Container>
    }
}