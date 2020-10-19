import React from "react";
import * as _ from "lodash";

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';

// eslint-disable-next-line import/no-unresolved
import { Predicate, PredicateChain, ANDPredicateChain, ORPredicateChain } from "../../models/predicates";

// eslint-disable-next-line import/no-unresolved
import { PredicateListNode } from './PredicateListNode';

export interface PredicateListProps {
    filterPredicate: Predicate;

    onUpdateFilterPredicate(predicate: Predicate): void;
}

export class PredicateList extends React.Component<PredicateListProps, {}> {
    private handleDeleteSubpredicate(indexChain: number[]): void {
        if (indexChain.length === 0) { // delete entire filter
            this.props.onUpdateFilterPredicate(null);
        } else {
            const deleteSubpredicate = (predicate: PredicateChain, indexChain: number[]): Predicate => {
                const idx = indexChain[0];
                indexChain = indexChain.slice(1);
                let subpredicates = predicate.split();

                // base case: index refers to item to remove
                if (indexChain.length === 0) {
                    subpredicates = _.concat(
                        subpredicates.slice(0, idx),
                        subpredicates.slice(idx + 1),
                    );

                    if (subpredicates.length > 1 && predicate instanceof ANDPredicateChain) {
                        return new ANDPredicateChain(...subpredicates);
                    } else if (subpredicates.length > 1) {
                        return new ORPredicateChain(...subpredicates);
                    } else {
                        return subpredicates[0];
                    }
                }

                const alteredPredicate = deleteSubpredicate(subpredicates[idx] as PredicateChain, indexChain);
                subpredicates = _.concat(
                    subpredicates.slice(0, idx),
                    subpredicates.slice(idx + 1)
                );

                if (predicate instanceof ANDPredicateChain) {
                    return (new ANDPredicateChain(...subpredicates)).and(alteredPredicate);
                } else {
                    return (new ORPredicateChain(...subpredicates)).or(alteredPredicate);
                }
            };

            const predicate = deleteSubpredicate(
                this.props.filterPredicate as PredicateChain,
                indexChain.slice()
            );

            this.props.onUpdateFilterPredicate(predicate);
        }
    }

    public render(): React.ReactElement {
        const predicateString = this.props.filterPredicate === null ?
            "" :
            this.props.filterPredicate.toString();

        return (
            <Container disableGutters>
                <Typography>
                    {`SQL: ${predicateString}`}
                </Typography>
                <List dense
                      style={{ width: "100%", maxHeight: 200, overflow: "auto", position: "relative" }} >
                    <PredicateListNode level={0}
                                       predicate={this.props.filterPredicate}
                                       indexChain={[]}
                                       onDeleteSubpredicate={this.handleDeleteSubpredicate.bind(this)} />
                </List>
            </Container>
        );
    }
}
