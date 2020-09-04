import { componentTypes, validatorTypes } from '@data-driven-forms/react-form-renderer';
import debouncePromise from '../../helpers/promise-debounce';
import { http, API } from '../../http_api';

export const asyncValidator = (value, serverId) =>
  API.get(`/api/pxe_servers?expand=resources&filter[]=name='${value ? value.replace('%', '%25') : ''}'`)
    .then((json) => {
      if (json.resources.find(({ id, name }) => name === value && id !== serverId)) {
        return __('Name has already been taken');
      }
      if (value === '' || value === undefined) {
        return __('Required');
      }
      return undefined;
    });

const asyncValidatorDebounced = debouncePromise(asyncValidator);

const basicInformationCommonFields = [{
  component: componentTypes.TEXT_FIELD,
  name: 'access_url',
  label: __('Access URL'),
}, {
  component: componentTypes.TEXT_FIELD,
  name: 'pxe_directory',
  label: __('PXE Directory'),
}, {
  component: componentTypes.TEXT_FIELD,
  name: 'windows_images_directory',
  label: __('Windows Images Directory'),
}, {
  component: componentTypes.TEXT_FIELD,
  name: 'customization_directory',
  label: __('Customization Directory'),
}];

const imageMenusSubForm = [{
  component: componentTypes.SUB_FORM,
  title: __('PXE Image Menus'),
  fields: [{
    component: componentTypes.TEXT_FIELD,
    name: 'pxe_menus[0].file_name',
    label: __('Filename'),
  }],
}];

const createSchema = isEditing => ({
  fields: [{
    component: componentTypes.SUB_FORM,
    title: __('Basic Information'),
    fields: [
      {
        component: componentTypes.TEXT_FIELD,
        name: 'name',
        label: __('Name'),
        isRequired: true,
        validate: [asyncValidatorDebounced],
      },
      {
        component: componentTypes.TEXT_FIELD,
        label: __('URI'),
        name: 'uri',
        isRequired: true,
        placeholder: 'schema://host:port/path',
        helperText: __('URI should begin with s3:// for Amazon Web Services, nfs:// for Network File System, swift:// for OpenStack Swift or smb:// for Samba'),
        validate: [
          {
            type: validatorTypes.REQUIRED,
          },
          {
            type: validatorTypes.PATTERN_VALIDATOR,
            pattern: /^((s3)|(nfs)|(swift)|(smb)):\/\//,
            message: __('URI should begin with s3://, nfs://, swift:// or smb://'),
          },
        ],
      },
      {
        component: componentTypes.SUB_FORM,
        name: 'authentication-subform',
        condition: {
          when: 'uri',
          pattern: /^(?!nfs:\/\/).+.*/,
        },
        fields: [{
          component: 'validate-credentials',
          name: 'authentication.valid',
          edit: isEditing,
          validationDependencies: ['uri'],
          asyncValidate: formValues => new Promise((resolve, reject) => http.post('/pxe/pxe_server_async_cred_validation', {
            uri: formValues.uri,
            ...formValues.authentication,
          }).then(({ status, message }) => (status === 'error' ? reject(message) : resolve()))),
          fields: [{
            component: componentTypes.TEXT_FIELD,
            name: 'authentication.userid',
            label: __('Username'),
            isRequired: true,
            validate: [{ type: validatorTypes.REQUIRED }],
          }, {
            component: 'password-field',
            name: 'authentication.password',
            label: __('Password'),
            isRequired: true,
            validate: [{ type: validatorTypes.REQUIRED }],
          }],
        }],
      },
      ...basicInformationCommonFields,
    ],
  }, {
    component: 'hr',
    name: 'form-divider',
  },
  ...imageMenusSubForm,
  ],
});

export default createSchema;
