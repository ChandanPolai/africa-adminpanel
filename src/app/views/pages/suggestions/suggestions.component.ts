import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { AuthService } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { debounceTime, Subject } from 'rxjs';
import { swalHelper } from '../../../core/constants/swal-helper';

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule],
  providers: [AuthService, ExportService],
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.css']
})
export class SuggestionsComponent implements OnInit, AfterViewInit {
  suggestions: any = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
    pagingCounter: 1
  };
  loading: boolean = false;
  exporting: boolean = false;
  private filterSubject = new Subject<void>();
  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    search: '',
    status: '',
    category: ''
  };

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'implemented', label: 'Implemented' },
    { value: 'rejected', label: 'Rejected' }
  ];

  get statusOptionsForModal() {
    return this.statusOptions.filter(s => s.value !== '');
  }

  categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'feature', label: 'Feature' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'other', label: 'Other' }
  ];

  selectedSuggestion: any = null;
  statusModal: any;
  viewModal: any;
  statusForm = {
    status: '',
    adminResponse: ''
  };

  paginationConfig = {
    id: 'suggestions-pagination'
  };

  constructor(
    private authService: AuthService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchSuggestions();
    });
  }

  ngOnInit(): void {
    this.fetchSuggestions();
  }

  async fetchSuggestions(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.authService.getAllSuggestions(this.filters);
      this.suggestions = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      swalHelper.showToast('Failed to fetch suggestions', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async viewSuggestion(suggestion: any): Promise<void> {
    this.selectedSuggestion = suggestion;
    
    // Initialize Bootstrap modal
    const modalElement = document.getElementById('viewModal');
    if (modalElement) {
      this.viewModal = new (window as any).bootstrap.Modal(modalElement);
      this.viewModal.show();
    }
  }

  ngAfterViewInit(): void {
    // Initialize modal - same pattern as users component
    setTimeout(() => {
      const modalElement = document.getElementById('statusModal');
      if (modalElement) {
        this.statusModal = new (window as any).bootstrap.Modal(modalElement);
      }
    }, 300);
  }

  async updateStatus(suggestion: any): Promise<void> {
    this.selectedSuggestion = suggestion;
    // Initialize form with suggestion data - same pattern as users component
    this.statusForm = {
      status: suggestion.status || '',
      adminResponse: suggestion.adminResponse || ''
    };
    
    // Show modal - same pattern as users component
    if (this.statusModal) {
      this.statusModal.show();
    } else {
      try {
        const modalElement = document.getElementById('statusModal');
        if (modalElement) {
          const modalInstance = new (window as any).bootstrap.Modal(modalElement);
          this.statusModal = modalInstance;
          modalInstance.show();
        }
      } catch (error) {
        console.error('Error showing status modal:', error);
      }
    }
  }

  closeStatusModal(): void {
    if (this.statusModal) {
      this.statusModal.hide();
    }
  }

  async saveStatus(): Promise<void> {
    if (!this.selectedSuggestion || !this.statusForm.status) {
      swalHelper.showToast('Please select a status', 'warning');
      return;
    }

    try {
      await this.authService.updateSuggestionStatus(this.selectedSuggestion._id, {
        status: this.statusForm.status,
        adminResponse: this.statusForm.adminResponse
      });
      
      swalHelper.showToast('Status updated successfully', 'success');
      this.closeStatusModal();
      this.fetchSuggestions();
    } catch (error) {
      console.error('Error updating status:', error);
      swalHelper.showToast('Failed to update status', 'error');
    }
  }

  async deleteSuggestion(suggestion: any): Promise<void> {
    const confirm = await swalHelper.confirmation(
      'Delete Suggestion',
      'Are you sure you want to delete this suggestion?',
      'warning'
    );

    if (confirm.isConfirmed) {
      try {
        await this.authService.deleteSuggestion(suggestion._id);
        swalHelper.showToast('Suggestion deleted successfully', 'success');
        this.fetchSuggestions();
      } catch (error) {
        console.error('Error deleting suggestion:', error);
        swalHelper.showToast('Failed to delete suggestion', 'error');
      }
    }
  }

  onSearch(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onStatusChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onCategoryChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onLimitChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.fetchSuggestions();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      search: '',
      status: '',
      category: ''
    };
    this.fetchSuggestions();
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-warning',
      'reviewed': 'bg-info',
      'implemented': 'bg-success',
      'rejected': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

