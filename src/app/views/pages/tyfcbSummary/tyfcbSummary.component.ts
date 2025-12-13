import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TyfcbService1, TyfcbSummaryResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';

@Component({
  selector: 'app-tyfcb-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [TyfcbService1, ChapterService, ExportService],
  templateUrl: './tyfcbSummary.component.html',
  styleUrls: ['./tyfcbSummary.component.css'],
})
export class TyfcbSummaryComponent implements OnInit {
  tyfcbData: TyfcbSummaryResponse | null = null;
  chapters: Chapter[] = [];
  loading: boolean = false;
  chaptersLoading: boolean = false;
  exporting: boolean = false;

  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    chapterName: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date())
  };

  paginationConfig = {
    id: 'tyfcb-pagination'
  };

  private filterSubject = new Subject<void>();

  constructor(
    private tyfcbService: TyfcbService1,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchTyfcbSummary();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchTyfcbSummary();
  }

  async fetchTyfcbSummary(): Promise<void> {
    this.loading = true;
    try {
      const requestParams: any = {
        startDate: this.filters.startDate,
        endDate: this.filters.endDate,
        page: this.filters.page,
        limit: this.filters.limit
      };
      
      if (this.filters.chapterName) {
        requestParams.chapter_name = this.filters.chapterName;
      }

      const response = await this.tyfcbService.getTyfcbSummary(requestParams);
      this.tyfcbData = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching TYFCB summary:', error);
      swalHelper.showToast('Failed to fetch TYFCB summary', 'error');
      this.tyfcbData = null;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
    }
  }

  async fetchChapters(): Promise<void> {
    this.chaptersLoading = true;
    try {
      const response = await this.chapterService.getAllChapters({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.chapters = response.docs || [];
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.chaptersLoading = false;
    }
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.fetchTyfcbSummary();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapterName: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date())
    };
    this.fetchTyfcbSummary();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatAmount(amount: number): string {
    if (amount >= 10000000) { // 1 Crore
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) { // 1 Lakh
      return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) { // 1 Thousand
      return `₹${(amount / 1000).toFixed(2)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  getCurrentPageUsers() {
    if (!this.tyfcbData?.data.userSummaries) return [];
    return this.tyfcbData.data.userSummaries;
  }

  getTotalUsers(): number {
    return this.tyfcbData?.data.pagination.totalUsers || 0;
  }

  getCurrentPage(): number {
    return this.tyfcbData?.data.pagination.currentPage || 1;
  }

  getTotalPages(): number {
    return this.tyfcbData?.data.pagination.totalPages || 1;
  }

  getHasNextPage(): boolean {
    return this.tyfcbData?.data.pagination.hasNextPage || false;
  }

  getHasPrevPage(): boolean {
    return this.tyfcbData?.data.pagination.hasPrevPage || false;
  }

  async exportToExcel(): Promise<void> {
    try {
      this.exporting = true;
      let allData: any[] = [];
      let page = 1;
      const limit = 1000;
      let hasNextPage = true;

      const exportParams: any = {
        startDate: this.filters.startDate,
        endDate: this.filters.endDate,
        page,
        limit
      };
      
      if (this.filters.chapterName) {
        exportParams.chapter_name = this.filters.chapterName;
      }

      while (hasNextPage) {
        const response = await this.tyfcbService.getTyfcbSummary(exportParams);
        allData = [...allData, ...response.data.userSummaries];
        hasNextPage = response.data.pagination.hasNextPage;
        page++;
        exportParams.page = page;
      }

      if (!allData || allData.length === 0) {
        swalHelper.showToast('No TYFCB data found for the selected filters', 'warning');
        return;
      }

      const exportData = allData.map((userSummary, index) => {
        return {
          'Sr No': index + 1,
          'Member Name': String(userSummary.user?.name || 'Unknown').replace(/[\r\n\t]/g, ' '),
          'Chapter': String(userSummary.user?.chapter_name || 'N/A').replace(/[\r\n\t]/g, ' '),
          'Total Amount': userSummary.totalAmount || 0,
          'Transaction Count': userSummary.transactionCount || 0,
          'Average Amount': Math.round(userSummary.averageAmount || 0),
          'First Transaction': userSummary.firstTransaction || 'N/A',
          'Last Transaction': userSummary.lastTransaction || 'N/A'
        };
      });

      const fileName = `TYFCB_Summary_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Excel file downloaded successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting to Excel:', {
        message: error.message,
        stack: error.stack,
        errorResponse: error.response || 'No response data'
      });
      swalHelper.showToast(`Failed to export to Excel: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      this.exporting = true;
      let allData: any[] = [];
      let page = 1;
      const limit = 1000;
      let hasNextPage = true;

      const exportParams: any = {
        startDate: this.filters.startDate,
        endDate: this.filters.endDate,
        page,
        limit
      };
      
      if (this.filters.chapterName) {
        exportParams.chapter_name = this.filters.chapterName;
      }

      while (hasNextPage) {
        const response = await this.tyfcbService.getTyfcbSummary(exportParams);
        allData = [...allData, ...response.data.userSummaries];
        hasNextPage = response.data.pagination.hasNextPage;
        page++;
        exportParams.page = page;
      }

      if (!allData || allData.length === 0) {
        swalHelper.showToast('No TYFCB data found for the selected filters', 'warning');
        return;
      }

      const fileName = `TYFCB_Summary_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Member Name', dataKey: 'memberName' },
        { header: 'Chapter', dataKey: 'chapter' },
        { header: 'Total Amount', dataKey: 'totalAmount' },
        { header: 'Transactions', dataKey: 'transactionCount' },
        { header: 'Average', dataKey: 'averageAmount' },
        { header: 'First Transaction', dataKey: 'firstTransaction' }
      ];

      const data = allData.map((userSummary, index) => {
        return {
          srNo: index + 1,
          memberName: userSummary.user?.name || 'Unknown',
          chapter: userSummary.user?.chapter_name || 'N/A',
          totalAmount: this.formatAmount(userSummary.totalAmount || 0),
          transactionCount: userSummary.transactionCount || 0,
          averageAmount: this.formatAmount(userSummary.averageAmount || 0),
          firstTransaction: userSummary.firstTransaction || 'N/A'
        };
      });

      const title = 'TYFCB Summary Report';
      let subtitle = 'All Chapters';
      if (this.filters.chapterName) {
        subtitle = `Chapter: ${this.filters.chapterName}`;
      }
      if (this.filters.startDate && this.filters.endDate) {
        subtitle += ` | Period: ${this.formatDate(this.filters.startDate)} to ${this.formatDate(this.filters.endDate)}`;
      }

      await this.exportService.exportToPDF(columns, data, title, subtitle, fileName);
      swalHelper.showToast('PDF file downloaded successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting to PDF:', {
        message: error.message,
        stack: error.stack,
        response: error.response || 'No response data'
      });
      swalHelper.showToast(`Failed to export to PDF: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      this.exporting = false;
    }
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}