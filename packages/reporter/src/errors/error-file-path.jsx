import _ from 'lodash'
import { Dialog } from '@reach/dialog'
import { action } from 'mobx'
import { observer, useLocalStore } from 'mobx-react'

import cs from 'classnames'
import React, { useRef } from 'react'
import Tooltip from '@cypress/react-tooltip'
import VisuallyHidden from '@reach/visually-hidden'
import { EditorPicker } from '@packages/ui-components'

import events from '../lib/events'

const openFile = (where, { absoluteFile: file, line, column }, editor) => {
  events.emit('open:file', {
    where,
    file,
    line,
    column,
    editor,
  })
}

const EditorPickerModal = observer(({ editors, onClose, onSetEditor }) => {
  const state = useLocalStore(() => ({
    chosenEditor: {},
    setChosenEditor: action((editor) => {
      state.chosenEditor = editor
    }),
    setOtherPath: action((otherPath) => {
      const otherOption = _.find(editors, { isOther: true })

      otherOption.openerId = otherPath
    }),
  }))

  const setEditor = () => {
    const editor = state.chosenEditor
    // TODO: validate editor is chosen

    onSetEditor(editor)
  }

  const cancelRef = useRef()

  if (!editors.length) return null

  return (
    <Dialog
      aria-label="Explanation of choosing an editor"
      initialFocusRef={cancelRef}
      isOpen={state.isModalOpen}
      onDismiss={onClose}
    >
      <div className='content'>
        <p>It looks like this is your first time opening a file in your editor. Please select from one of the editors we found on your system.</p>
        <p>The editor you select will be used automatically from now on to open files. You can change your selection in the Settings tab of the Cypress app.</p>
        <EditorPicker
          chosen={state.chosenEditor}
          editors={editors}
          onSelect={state.setChosenEditor}
          onUpdateOtherPath={state.setOtherPath}
        />
      </div>
      <div className='controls'>
        <button className='submit' onClick={setEditor}>Set Editor</button>
        <button className='cancel' onClick={onClose} ref={cancelRef}>Cancel</button>
      </div>
      <button className='close-button' onClick={onClose}>
        <VisuallyHidden>Close</VisuallyHidden>
        <span aria-hidden>
          <i className='fa fa-remove' />
        </span>
      </button>
    </Dialog>
  )
})

const ErrorFilePath = observer(({ fileDetails }) => {
  const state = useLocalStore(() => ({
    editors: [],
    isLoadingEditor: false,
    isModalOpen: false,
    setEditors: action((editors) => {
      state.editors = editors
    }),
    setIsLoadingEditor: action((isLoading) => {
      state.isLoadingEditor = isLoading
    }),
    setIsModalOpen: action((isOpen) => {
      state.isModalOpen = isOpen
    }),
  }))

  const openFileInEditor = () => {
    state.setIsLoadingEditor(true)

    events.emit('get:user:editor', (result) => {
      state.setIsLoadingEditor(false)

      if (result.preferredEditor) {
        return openFile('editor', fileDetails, result.preferredEditor)
      }

      state.setEditors(result.availableEditors)
      state.setIsModalOpen(true)
    })
  }

  const setEditor = (editor) => {
    events.emit('set:user:editor', editor)
    state.setIsModalOpen(false)
    openFile('editor', fileDetails, editor)
  }

  const openFileOnComputer = () => {
    openFile('computer', fileDetails)
  }

  const { relativeFile, line, column } = fileDetails

  const tooltipContent = (<>
    <button onClick={openFileOnComputer}>
      <span>Open on Computer</span>
    </button>
    <button
      className={cs({ 'is-loading': state.isLoadingEditor })}
      disabled={state.isLoadingEditor}
      onClick={openFileInEditor}
    >
      <span className='text'>Open in Editor</span>
      <span className='loader'>
        <i className='fa fa-spinner fa-spin fa-pulse'></i>
      </span>
    </button>
  </>)

  return (
    <span className='runnable-err-file-path'>
      <Tooltip title={tooltipContent} className='err-file-options tooltip'>
        <span>{relativeFile}:{line}:{column}</span>
      </Tooltip>
      <EditorPickerModal
        editors={state.editors}
        onSetEditor={setEditor}
        onClose={_.partial(state.setIsModalOpen, false)}
      />
    </span>
  )
})

export default ErrorFilePath
