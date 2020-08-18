import React from 'react';
import * as _ from 'underscore';
import { Container, List} from 'semantic-ui-react';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationTimeseriesResponse, IPenetrationData } from '../models/apiModels';
import { IAestheticMapping, IAesthetics } from '../viewmodels/aestheticMapping';

import { TimeseriesSelector, ITimeseriesSelectorProps } from './TimeseriesSelector';

export interface IPenetrationControlsProps {
    constants: AVConstants,
    penetration: IPenetrationData,
    onUpdateTimeseriesAesthetic(mapping: IAesthetics): void,
}

interface IPenetrationControlsState {
    aesthetics: IAesthetics,
    timeseries: string[],
}

export class PenetrationControls extends React.Component<IPenetrationControlsProps, IPenetrationControlsState> {
    private apiClient: APIClient;

    constructor(props: IPenetrationControlsProps) {
        super(props);

        this.state = {
            aesthetics: {
                penetrationId: this.props.penetration.penetrationId,
                color: null,
                opacity: null,
                radius: null,
            },
            timeseries: [],
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private fetchTimeseries() {
        this.apiClient.fetchAllTimeseries(this.props.penetration.penetrationId)
            .then((res: any) => res.data)
            .then((res: IPenetrationTimeseriesResponse) => {
                this.setState({timeseries: res.timeseries});
            })
            .catch((err: any) => {
                console.error(err);
            });
    }

    private handleAestheticChange(aesthetic: string, aestheticMapping: IAestheticMapping) {
        const otherAesthetics = _.without(_.keys(this.state.aesthetics), 'penetrationId', aesthetic);

        let aesthetics: IAesthetics = _.extend(
            _.pick(this.state.aesthetics, otherAesthetics),
            { 'penetrationId': this.props.penetration.penetrationId, [aesthetic]: aestheticMapping }
        );

        // check the other two aesthetics to see if this one is already represented
        otherAesthetics.forEach((aes: keyof(IAesthetics)) => {
            const otherMapping: IAestheticMapping = aesthetics[aes] as IAestheticMapping;
            if (otherMapping !== null && otherMapping.timeseriesId === aestheticMapping.timeseriesId) {
                aesthetics[aes] = null;
            }
        })

        this.setState({aesthetics: aesthetics}, () => {
            this.props.onUpdateTimeseriesAesthetic(this.state.aesthetics);
        });
    }

    public componentDidMount() {
        this.fetchTimeseries();
    }

    public render() {
        const timeseriesList = (
            <List>
                {this.state.timeseries.map(t => {
                    const timeseriesSelectorProps: ITimeseriesSelectorProps = {
                        constants: this.props.constants,
                        penetrationId: this.props.penetration.penetrationId,
                        timeseriesId: t,
                        onAestheticChange: this.handleAestheticChange.bind(this)
                    };
                    return <List.Item key={t}>{<TimeseriesSelector {...timeseriesSelectorProps} />}</List.Item>
                })}
            </List>
        );

        return (
            <Container>
                {timeseriesList}
                {/* <TimeseriesSelector {...timeseriesSelectorProps} /> */}
            </Container>
        );
    }
}