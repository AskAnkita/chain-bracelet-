(() => {
  if (window.customElements.get('metal-variant-filter')) return;

  const defaultedForms = new Set();

  class MetalVariantFilter extends HTMLElement {
    connectedCallback() {
      this.abortController?.abort();
      this.abortController = new AbortController();
      this.options = Array.from(this.querySelectorAll('[data-metal-filter-option]'));
      this.fieldset = this.closest('.variant-picker__option--metal');

      if (!this.options.length || !this.fieldset) return;

      const formId = this.closest('variant-picker')?.getAttribute('form-id');
      const defaultMetal = formId && !defaultedForms.has(formId) ? this.dataset.defaultMetal : null;
      const defaultOption = this.options.find((option) => option.value === defaultMetal);
      if (defaultOption) {
        defaultedForms.add(formId);
        defaultOption.checked = true;
      }

      this.options.forEach((option) => {
        option.addEventListener('change', () => {
          if (option.checked) this.selectMetal(option.value);
        }, { signal: this.abortController.signal });
      });

      const activeOption = this.options.find((option) => option.checked) || this.options[0];
      this.selectMetal(activeOption.value);
    }

    disconnectedCallback() {
      this.abortController?.abort();
    }

    selectMetal(metal) {
      const choices = Array.from(this.fieldset.querySelectorAll(`.coin-swatch[data-metal-group="${metal}"]`));
      this.fieldset.dataset.activeMetal = metal;

      if (choices.some((choice) => choice.control?.checked || choice.classList.contains('is-selected'))) return;

      const firstAvailable = choices.find((choice) => !choice.classList.contains('is-disabled'));
      if (!firstAvailable) return;

      if (firstAvailable.tagName === 'A') {
        firstAvailable.click();
      } else {
        firstAvailable.control?.click();
      }
    }
  }

  window.customElements.define('metal-variant-filter', MetalVariantFilter);
})();
