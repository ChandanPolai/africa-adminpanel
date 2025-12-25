import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { AuthService } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { debounceTime, Subject } from 'rxjs';
import { swalHelper } from '../../../core/constants/swal-helper';
import { environment } from 'src/env/env.local';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule],
  providers: [AuthService, ExportService],
  templateUrl: './complaints.component.html',
  styleUrls: ['./complaints.component.css']
})
export class ComplaintsComponent implements OnInit, AfterViewInit {
  complaints: any = {
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
  imageurl = environment.imageUrl;

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
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  get statusOptionsForModal() {
    return this.statusOptions.filter(s => s.value !== '');
  }

  categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'account', label: 'Account' },
    { value: 'other', label: 'Other' }
  ];

  selectedComplaint: any = null;
  statusModal: any;
  viewModal: any;
  statusForm = {
    status: '',
    adminResponse: ''
  };

  paginationConfig = {
    id: 'complaints-pagination'
  };

  constructor(
    private authService: AuthService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchComplaints();
    });
  }

  ngOnInit(): void {
    this.fetchComplaints();
  }

  async fetchComplaints(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.authService.getAllComplaints(this.filters);
      this.complaints = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching complaints:', error);
      swalHelper.showToast('Failed to fetch complaints', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async viewComplaint(complaint: any): Promise<void> {
    this.selectedComplaint = complaint;
    
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

  async updateStatus(complaint: any): Promise<void> {
    this.selectedComplaint = complaint;
    // Initialize form with complaint data - same pattern as users component
    this.statusForm = {
      status: complaint.status || '',
      adminResponse: complaint.adminResponse || ''
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
    if (!this.selectedComplaint || !this.statusForm.status) {
      swalHelper.showToast('Please select a status', 'warning');
      return;
    }

    try {
      await this.authService.updateComplaintStatus(this.selectedComplaint._id, {
        status: this.statusForm.status,
        adminResponse: this.statusForm.adminResponse
      });
      
      swalHelper.showToast('Status updated successfully', 'success');
      this.closeStatusModal();
      this.fetchComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      swalHelper.showToast('Failed to update status', 'error');
    }
  }

  async deleteComplaint(complaint: any): Promise<void> {
    const confirm = await swalHelper.confirmation(
      'Delete Complaint',
      'Are you sure you want to delete this complaint?',
      'warning'
    );

    if (confirm.isConfirmed) {
      try {
        await this.authService.deleteComplaint(complaint._id);
        swalHelper.showToast('Complaint deleted successfully', 'success');
        this.fetchComplaints();
      } catch (error) {
        console.error('Error deleting complaint:', error);
        swalHelper.showToast('Failed to delete complaint', 'error');
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
    this.fetchComplaints();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      search: '',
      status: '',
      category: ''
    };
    this.fetchComplaints();
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-warning',
      'in_progress': 'bg-info',
      'resolved': 'bg-success',
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

  openImage(url: string): void {
    window.open(url, '_blank');
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

