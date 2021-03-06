import React from 'react';
import {getSuggestionId, WalletSuggestionAction, WALLET_SUGGESTION_ALL_ACTIONS} from '@universal-login/commons';

interface SuggestionsProps {
  connections: string[];
  creations: string[];
  onCreateClick: (...args: any[]) => void;
  onConnectionClick: (...args: any[]) => void;
  actions?: WalletSuggestionAction[];
}

const getSuggestionsItems = (operationType: string, array: string[], onClick: (...args: any[]) => void) =>
  array.map((element => (
    <li
      key={`${operationType}_${element}`}
      className="suggestions-item"
    >
      <button className="suggestions-item-btn" id={getSuggestionId(operationType)} onClick={() => onClick(element)}>
        <p className="suggestions-item-text">{element}</p>
        <p className="suggestions-item-btn-text">{operationType}</p>
      </button>
    </li>
  )));

const getSuggestions = (suggestions: string[], actions: WalletSuggestionAction[] = WALLET_SUGGESTION_ALL_ACTIONS, flag: WalletSuggestionAction): string[] =>
  actions.includes(flag) ? suggestions : [];

export const Suggestions = ({connections, creations, onCreateClick, onConnectionClick, actions}: SuggestionsProps) => {
  const connectionsSuggestions = getSuggestionsItems('connect to existing', getSuggestions(connections, actions, WalletSuggestionAction.connect), onConnectionClick);
  const creationsSuggestions = getSuggestionsItems('create new', getSuggestions(creations, actions, WalletSuggestionAction.create), onCreateClick);
  const recoversSuggestions = getSuggestionsItems('recover', getSuggestions(connections, actions, WalletSuggestionAction.recover), () => alert('not implemented'));
  return (
    <ul className="suggestions-list">
      {connectionsSuggestions}
      {creationsSuggestions}
      {recoversSuggestions}
    </ul>
  );
};

export default Suggestions;
