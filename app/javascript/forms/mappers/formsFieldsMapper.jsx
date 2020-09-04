import React from 'react';
import { componentTypes } from '@data-driven-forms/react-form-renderer';
import { formFieldsMapper, components } from '@data-driven-forms/pf3-component-mapper';

import AsyncCredentials from '../../components/async-credentials/async-credentials';
import AsyncProviderCredentials from '../../components/async-credentials/async-provider-credentials';
import DualGroup from '../../components/dual-group';
import DualListSelect from '../../components/dual-list-select';
import EditPasswordField from '../../components/async-credentials/edit-password-field';
import PasswordField from '../../components/async-credentials/password-field';
import { DataDrivenFormCodeEditor } from '../../components/code-editor';

const fieldsMapper = {
  ...formFieldsMapper,
  'code-editor': DataDrivenFormCodeEditor,
  'edit-password-field': EditPasswordField,
  'dual-group': DualGroup,
  'dual-list-select': DualListSelect,
  hr: () => <hr />,
  note: props => <div className={props.className} role="alert">{props.label}</div>,
  'password-field': PasswordField,
  'validate-credentials': AsyncCredentials,
  'validate-provider-credentials': AsyncProviderCredentials,
  [componentTypes.SELECT]: props => <components.SelectField classNamePrefix="miq-ddf-select" placeholder={`<${__('Choose')}>`} {...props} />,
};

export default fieldsMapper;
