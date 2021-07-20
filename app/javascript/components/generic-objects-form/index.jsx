import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';

import MiqFormRenderer, { useFieldApi, useFormApi } from '@@ddf';
import componentMapper from '../../forms/mappers/componentMapper';
import createSchema from './generic-objects-form.schema';
import miqRedirectBack from '../../helpers/miq-redirect-back';
import get from 'lodash/get';
import { TrashCan32 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';

const GenericObjectForm = ({ recordId }) => {
  const [{ initialValues, isLoading }, setState] = useState({ isLoading: !!recordId });
  const promise = useMemo(() => API.options('/api/generic_object_definitions/'), []);
  const submitLabel = !!recordId ? __('Save') : __('Add');

  //when the form is submitted, any uploaded image is encoded to Base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  //custom file edit component that displays the currently saved image and a delete button to replace it
  const FileEditComponent = (props) => {
    const { input, label, src, description } = useFieldApi(props);
    const formOptions = useFormApi();

    const deleteFile = () => {
      formOptions.change('image_update', true);
    };

    return (
      <div>
        <label className='bx--label' htmlFor={input.name}>{label}</label>
        <br />
        <div className='edit-div'>
          <img className='edit-image' id='imageDisplay' src={src} />
          <Button className='edit-button' renderIcon={TrashCan32} iconDescription={description} hasIconOnly onClick={deleteFile} {...input} />
        </div>
      </div>
    );
  };

  //custom validator that checks any uploaded files to see if they meet the requirements
  const fileValidator = ({ maxSize }) => {
    return (value) => {
      const imageTypes = /image\/jpg|image\/jpeg|image\/png|image\/svg/;

      if (value && value.inputFiles[0] && !imageTypes.test(value.inputFiles[0].type))
        return __(`File must be an image of type "png", "jpg/jpeg", or "svg". The currently uploaded file's extension is "${value.inputFiles[0].type.split('/').pop()}"`);

      if (value && value.inputFiles[0] && value.inputFiles[0].size > maxSize)
        return __(`File is too large, maximum allowed size is ${maxSize} bytes. Current file has ${value.inputFiles[0].size} bytes`);
    };
  };

  //custom validator that makes sure attribute, association, and method names can only contain lowercase letters, numbers or underscores
  const syntaxValidator = () => {
    var format = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/;
    return (value) => {
      if (value != value.toLowerCase() || format.test(value))
        return __(`Name can only contain lowercase letters, numbers, or underscores`);
    };
  };

  //custom validator that checks to make sure no two attributes/associations/methods have the same name
  const uniqueNameValidator = (values) => {
    const errors = { attributes: [], associations: [], methods: [] };

    for (const index in values.attributes) {
      for (const position in values.attributes) {
        if (values.attributes[index] != undefined && values.attributes[position] != undefined) {
          if (index != position && values.attributes[index].attributes_name == values.attributes[position].attributes_name)
            errors.attributes[position] = { attributes_name: __('Name must be unique') };
        }
      }
    }

    for (const index in values.associations) {
      for (const position in values.associations) {
        if (values.associations[index] != undefined && values.associations[position] != undefined) {
          if (index != position && values.associations[index].associations_name == values.associations[position].associations_name)
            errors.associations[position] = { associations_name: __('Name must be unique') };
        }
      }
    }

    for (const index in values.methods) {
      for (const position in values.methods) {
        if (values.methods[index] != undefined && values.methods[position] != undefined) {
          if (index != position && values.methods[index].methods_name == values.methods[position].methods_name)
            errors.methods[position] = { methods_name: __('Name must be unique') };
        }
      }
    }

    return errors;
  };

  //custom component and validator mappers that combine the above components/validators with the existing mappers used in manageiq
  const mapper = {
    ...componentMapper,
    'file-edit': FileEditComponent,
  };

  const validMapper = {
    'file': fileValidator,
    'syntax': syntaxValidator,
  };

  useEffect(() => {
    if (recordId) {
      miqSparkleOn();
      API.get(`/api/generic_object_definitions/${recordId}?attributes=picture.image_href`).then(initialValues => {
        promise.then(({ data: { allowed_association_types } }) => {
          initialValues.attributes = [];
          initialValues.associations = [];
          initialValues.methods = [];

          //modifies the attributes/associations/methods data from the API to match what the form is expecting
          for (const object in initialValues.properties.attributes)
            initialValues.attributes.push({ attributes_name: object, type: initialValues.properties.attributes[object] });

          for (const object in initialValues.properties.associations)
            initialValues.associations.push({ associations_name: object, class: __(allowed_association_types[initialValues.properties.associations[object]]) });

          for (const object in initialValues.properties.methods)
            initialValues.methods.push({ methods_name: initialValues.properties.methods[object] });

          //check to display file upload/edit component depending on whether the generic object being edited already has a custom image or not
          initialValues['image_update'] = !initialValues.picture;
          delete initialValues.properties;
          setState({ initialValues, isLoading: false });
        });
      });
      miqSparkleOff();
    }
  }, [recordId]);

  const onSubmit = (values, formApi) => {
    promise.then(async ({ data: { allowed_association_types } }) => {

      //check to determine whether to delete or replace existing custom image
      if (values.file_upload) {
        const fileList = get(values, formApi.fileInputs[0]).inputFiles;
        const base64Encoded = await toBase64(fileList[0]);
        values['picture'] = { extension: fileList[0].type.split('/').pop(), content: base64Encoded.split(',').pop() };
      }
      else if (values.image_update)
        values['picture'] = {};

      //modifies the attributes/associations/methods data from the form to match what the API is expecting
      values['properties'] = { 'attributes': {}, 'associations': {}, 'methods': [] };

      for (const index in values.attributes)
        values.properties.attributes[values.attributes[index].attributes_name] = values.attributes[index].type;

      for (const index in values.associations) {
        values.properties.associations[values.associations[index].associations_name] = (typeof values.associations[index].class === 'object') ?
          values.associations[index].class.value :
          Object.keys(allowed_association_types).find(key =>
            allowed_association_types[key] === values.associations[index].class.replace(/»/, '').replace(/«/, '')
          );
      }

      for (const index in values.methods)
        values.properties.methods.push(values.methods[index].methods_name);

      delete values.associations;
      delete values.attributes;
      delete values.methods;
      delete values.image_update;
      delete values.file_upload;
      miqSparkleOn();

      const request = recordId ? API.patch(`/api/generic_object_definitions/${recordId}`, values) : API.post('/api/generic_object_definitions', values);
      request.then(() => {
        const message = sprintf(
          recordId
            ? __('Generic Object Definition "%s" was saved.')
            : __('Generic Object Definition "%s" was added.'),
          values.name,
        );
        miqRedirectBack(message, undefined, '/generic_object_definition/show_list');
      }).catch(miqSparkleOff);
    });
  };

  const onCancel = () => {
    const message = sprintf(
      recordId
        ? __('Edit of Generic Object Definition "%s" was cancelled by the user.')
        : __('Add of new Generic Object Definition was cancelled by the user.'),
      initialValues && initialValues.name,
    );
    miqRedirectBack(message, 'warning', '/generic_object_definition/show_list');
  };

  return !isLoading && (
    <MiqFormRenderer
      schema={createSchema(initialValues, !!recordId, promise)}
      validate={uniqueNameValidator}
      componentMapper={mapper}
      validatorMapper={validMapper}
      initialValues={initialValues}
      canReset={!!recordId}
      onSubmit={onSubmit}
      onCancel={onCancel}
      buttonsLabels={{ submitLabel }}
    />
  );
};

GenericObjectForm.propTypes = {
  recordId: PropTypes.string,
};
GenericObjectForm.defaultProps = {
  recordId: undefined,
};

export default GenericObjectForm;
