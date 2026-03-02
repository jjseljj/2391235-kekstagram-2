import { isEscapeKey } from './utils.js';
import { initUploadEditor, resetEditor } from './img-upload-editor.js';
import { sendData } from './api.js';

const FORM_SELECTOR = '.img-upload__form';
const OVERLAY_SELECTOR = '.img-upload__overlay';
const FILE_INPUT_SELECTOR = '.img-upload__input';
const CANCEL_BUTTON_SELECTOR = '.img-upload__cancel';
const HASHTAGS_SELECTOR = '.text__hashtags';
const DESCRIPTION_SELECTOR = '.text__description';
const SUBMIT_BUTTON_SELECTOR = '.img-upload__submit';

const MODAL_OPEN_CLASS = 'modal-open';
const HIDDEN_CLASS = 'hidden';

const SUBMIT_TEXT_DEFAULT = 'Опубликовать';
const SUBMIT_TEXT_SENDING = 'Публикую...';

const HASHTAG_MAX_COUNT = 5;
const HASHTAG_MIN_LENGTH = 2;
const HASHTAG_MAX_LENGTH = 20;

const COMMENT_MAX_LENGTH = 140;

const HASHTAG_REGEXP = /^#[A-Za-zА-Яа-яЁё0-9_]+$/;

const formElement = document.querySelector(FORM_SELECTOR);
const overlayElement = document.querySelector(OVERLAY_SELECTOR);
const fileInputElement = document.querySelector(FILE_INPUT_SELECTOR);
const cancelButtonElement = document.querySelector(CANCEL_BUTTON_SELECTOR);
const hashtagsElement = document.querySelector(HASHTAGS_SELECTOR);
const descriptionElement = document.querySelector(DESCRIPTION_SELECTOR);
const submitButtonElement = document.querySelector(SUBMIT_BUTTON_SELECTOR);

let pristine = null;
let isEditorInitialized = false;

const PREVIEW_IMG_SELECTOR = '.img-upload__preview img';
const EFFECTS_PREVIEW_SELECTOR = '.effects__preview';

const FILE_TYPES = ['jpg', 'jpeg', 'png'];

const previewImgElement = document.querySelector(PREVIEW_IMG_SELECTOR);
const effectsPreviewElements = document.querySelectorAll(EFFECTS_PREVIEW_SELECTOR);

let uploadedImageUrl = null;

const isValidFileType = (file) => {
  const fileName = file.name.toLowerCase();
  return FILE_TYPES.some((type) => fileName.endsWith(type));
};

const setPreviewImage = (file) => {
  if (!previewImgElement) {
    return;
  }

  if (uploadedImageUrl) {
    URL.revokeObjectURL(uploadedImageUrl);
  }

  uploadedImageUrl = URL.createObjectURL(file);

  previewImgElement.src = uploadedImageUrl;

  effectsPreviewElements.forEach((preview) => {
    preview.style.backgroundImage = `url(${uploadedImageUrl})`;
  });
};

const isOverlayOpened = () => overlayElement && !overlayElement.classList.contains(HIDDEN_CLASS);

const getHashtags = (value) => value
  .trim()
  .split(/\s+/)
  .filter((tag) => tag.length > 0);

const isTextFieldFocused = () => document.activeElement === hashtagsElement || document.activeElement === descriptionElement;

const validateComment = (value) => value.length <= COMMENT_MAX_LENGTH;

const validateHashtagsCount = (value) => getHashtags(value).length <= HASHTAG_MAX_COUNT;

const validateHashtagsUnique = (value) => {
  const hashtags = getHashtags(value).map((tag) => tag.toLowerCase());
  return new Set(hashtags).size === hashtags.length;
};

const validateHashtagsFormat = (value) => {
  const hashtags = getHashtags(value);
  if (hashtags.length === 0) {
    return true;
  }

  return hashtags.every((tag) => {
    if (tag.length < HASHTAG_MIN_LENGTH || tag.length > HASHTAG_MAX_LENGTH) {
      return false;
    }
    return HASHTAG_REGEXP.test(tag);
  });
};

const getHashtagsErrorMessage = (value) => {
  const hashtags = getHashtags(value);

  if (hashtags.length === 0) {
    return '';
  }

  if (!validateHashtagsCount(value)) {
    return `Не больше ${HASHTAG_MAX_COUNT} хэштегов`;
  }

  if (!validateHashtagsUnique(value)) {
    return 'Хэштеги не должны повторяться';
  }

  if (!validateHashtagsFormat(value)) {
    return `Хэштег начинается с # и содержит только буквы/цифры/_, длина ${HASHTAG_MIN_LENGTH}-${HASHTAG_MAX_LENGTH}`;
  }

  return '';
};

const getCommentErrorMessage = () => `Длина комментария не больше ${COMMENT_MAX_LENGTH} символов`;

const initValidate = () => {
  if (!formElement) {
    return null;
  }

  const instance = new Pristine(formElement, {
    classTo: 'img-upload__field-wrapper',
    errorTextParent: 'img-upload__field-wrapper',
    errorTextTag: 'span',
    errorTextClass: 'text__error',
  });

  if (hashtagsElement) {
    instance.addValidator(hashtagsElement, validateHashtagsFormat, getHashtagsErrorMessage, 1, true);
    instance.addValidator(hashtagsElement, validateHashtagsCount, getHashtagsErrorMessage, 2, true);
    instance.addValidator(hashtagsElement, validateHashtagsUnique, getHashtagsErrorMessage, 3, true);
  }

  if (descriptionElement) {
    instance.addValidator(descriptionElement, validateComment, getCommentErrorMessage);
  }

  return instance;
};

const resetForm = () => {
  formElement.reset();
  fileInputElement.value = '';

  if (pristine) {
    pristine.reset();
  }

  formElement.querySelectorAll('.text__error').forEach((el) => el.remove());
  formElement.querySelectorAll('.pristine-error').forEach((el) => el.classList.remove('pristine-error'));
  formElement.querySelectorAll('.pristine-success').forEach((el) => el.classList.remove('pristine-success'));
};

const blockSubmitButton = () => {
  if (!submitButtonElement) {
    return;
  }
  submitButtonElement.disabled = true;
  submitButtonElement.textContent = SUBMIT_TEXT_SENDING;
};

const unblockSubmitButton = () => {
  if (!submitButtonElement) {
    return;
  }
  submitButtonElement.disabled = false;
  submitButtonElement.textContent = SUBMIT_TEXT_DEFAULT;
};

const getTemplate = (templateId) => document.querySelector(templateId);

const cloneMessageElement = (template) => template.content.firstElementChild.cloneNode(true);

const getInnerElement = (messageElement, innerSelector) => messageElement.querySelector(innerSelector);

const getButtonElement = (messageElement, buttonSelector) => messageElement.querySelector(buttonSelector);

const addMessageListeners = (onEsc, onOutsideClick) => {
  document.addEventListener('keydown', onEsc);
  document.addEventListener('click', onOutsideClick);
};

const removeMessageListeners = (onEsc, onOutsideClick) => {
  document.removeEventListener('keydown', onEsc);
  document.removeEventListener('click', onOutsideClick);
};

const createRemoveMessage = (messageElement, onEsc, onOutsideClick) => () => {
  messageElement.remove();
  removeMessageListeners(onEsc, onOutsideClick);
};

const createEscHandler = (removeMessage) => (evt) => {
  if (isEscapeKey(evt)) {
    evt.preventDefault();
    removeMessage();
  }
};

const createOutsideClickHandler = (innerElement, removeMessage) => (evt) => {
  if (innerElement && !innerElement.contains(evt.target)) {
    removeMessage();
  }
};

const bindCloseButton = (buttonElement, removeMessage) => {
  if (!buttonElement) {
    return;
  }
  buttonElement.addEventListener('click', (evt) => {
    evt.preventDefault();
    removeMessage();
  });
};

const showMessage = (templateId, innerSelector, buttonSelector) => {
  const template = getTemplate(templateId);
  if (!template) {
    return;
  }

  const messageElement = cloneMessageElement(template);
  const innerElement = getInnerElement(messageElement, innerSelector);
  const buttonElement = getButtonElement(messageElement, buttonSelector);

  let removeMessage = () => {};

  const onEsc = createEscHandler(() => removeMessage());
  const onOutsideClick = createOutsideClickHandler(innerElement, () => removeMessage());

  removeMessage = createRemoveMessage(messageElement, onEsc, onOutsideClick);

  bindCloseButton(buttonElement, removeMessage);
  addMessageListeners(onEsc, onOutsideClick);

  document.body.append(messageElement);
};
const isMessageOpened = () =>
  document.querySelector('.success') || document.querySelector('.error');

const showSuccessMessage = () => showMessage('#success', '.success__inner', '.success__button');
const showErrorMessage = () => showMessage('#error', '.error__inner', '.error__button');

const onDocumentKeydown = (evt) => {
  if (!isEscapeKey(evt)) {
    return;
  }

  if (isMessageOpened()) {
    return;
  }

  if (isTextFieldFocused()) {
    return;
  }

  evt.preventDefault();
  closeUploadForm();
};

function closeUploadForm() {
  if (!isOverlayOpened()) {
    return;
  }

  overlayElement.classList.add(HIDDEN_CLASS);
  document.body.classList.remove(MODAL_OPEN_CLASS);
  document.removeEventListener('keydown', onDocumentKeydown);
  if (uploadedImageUrl) {
    URL.revokeObjectURL(uploadedImageUrl);
    uploadedImageUrl = null;
  }
  resetForm();
  resetEditor();
}

const clearValidationErrors = () => {
  if (pristine) {
    pristine.reset();
  }

  formElement
    .querySelectorAll('.pristine-error, .text__error')
    .forEach((el) => el.remove());
};

const openUploadForm = () => {
  clearValidationErrors();

  overlayElement.classList.remove(HIDDEN_CLASS);
  document.body.classList.add(MODAL_OPEN_CLASS);
  document.addEventListener('keydown', onDocumentKeydown);
};

const onFileInputChange = () => {
  const file = fileInputElement.files[0];

  if (!file || !isValidFileType(file)) {
    fileInputElement.value = '';
    return;
  }

  setPreviewImage(file);

  openUploadForm();

  if (!isEditorInitialized) {
    initUploadEditor();
    isEditorInitialized = true;
  }

  resetEditor();
};

const onCancelButtonClick = (evt) => {
  evt.preventDefault();
  closeUploadForm();
};

const onFormSubmit = (evt) => {
  evt.preventDefault();

  if (!pristine) {
    return;
  }

  const isValid = pristine.validate();
  if (!isValid) {
    return;
  }

  blockSubmitButton();

  sendData(new FormData(formElement))
    .then(() => {
      closeUploadForm();
      showSuccessMessage();
    })
    .catch(() => {
      showErrorMessage();
    })
    .finally(() => {
      unblockSubmitButton();
    });
};

const onFormReset = () => {
  resetEditor();
  if (pristine) {
    pristine.reset();
  }
};

const initUploadForm = () => {
  if (!formElement || !overlayElement || !fileInputElement || !cancelButtonElement) {
    return;
  }

  pristine = initValidate();
  fileInputElement.addEventListener('change', onFileInputChange);
  cancelButtonElement.addEventListener('click', onCancelButtonClick);
  formElement.addEventListener('submit', onFormSubmit);
  formElement.addEventListener('reset', onFormReset);
};

initUploadForm();

export { initUploadForm };
