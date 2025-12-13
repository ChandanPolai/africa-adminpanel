
import { AppWorker } from './../../../core/workers/app.worker';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { SideBarService } from './side-bar.service';
import { CommonModule } from '@angular/common';
import { AppStorage } from 'src/app/core/utilities/app-storage';
import { swalHelper } from 'src/app/core/constants/swal-helper';
import { AuthService } from 'src/app/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
})
export class SideBarComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private router: Router,
    private storage: AppStorage,
    public authService: AuthService,
    public sideBarService: SideBarService,
    public appWorker: AppWorker,
    private cdr: ChangeDetectorRef
  ) {}

  isSidebarOpen = false;
  isMobile = false;
  activeSubMenuIndex: number | null = null;

  // Icon mapping from Feather to Font Awesome
  private iconMap: { [key: string]: string } = {
    'home': 'fas fa-home',
    'user-plus': 'fas fa-user-plus',
    'users': 'fas fa-users',
    'file-text': 'fas fa-file-text',
    'calendar-check': 'fas fa-calendar-check',
    'file-import': 'fas fa-file-import',
    'globe': 'fas fa-globe',
    'map': 'fas fa-map',
    'map-pin': 'fas fa-map-marker-alt',
    'layers': 'fas fa-layer-group',
    'tag': 'fas fa-tag',
    'list': 'fas fa-list',
    'banner': 'fas fa-flag',
    'award': 'fas fa-award',
    'clipboard-list': 'fas fa-clipboard-list',
    'lock': 'fas fa-lock',
    'calendar': 'fas fa-calendar',
    'check-circle': 'fas fa-check-circle',
    'check-square': 'fas fa-check-square',
    'corner-up-right': 'fas fa-external-link-alt',
    'corner-down-left': 'fas fa-reply',
    'message-square': 'fas fa-comment',
    'user-check': 'fas fa-user-check',
    'trending-up': 'fas fa-chart-line',
    'user': 'fas fa-user',
    'question-circle': 'fas fa-question-circle',
    'history': 'fas fa-history',
    'clipboard': 'fas fa-clipboard',
    'credit-card': 'fas fa-credit-card',
    'cog': 'fas fa-cog',
    'log-out': 'fas fa-sign-out-alt',
    'key': 'fas fa-key',
    'settings': 'fas fa-cogs',
    'layout': 'fas fa-th-large',
    'bar-chart': 'fas fa-chart-bar',
    'podcast': 'fas fa-podcast',
    'chevron-down': 'fas fa-chevron-down',
    'chevron-right': 'fas fa-chevron-right',
    'user-cog': 'fas fa-user-cog'
  };

  ngOnInit() {
    this.checkScreenSize();
    this.autoExpandActiveSubmenu();
    
    // Listen to route changes to auto-expand dropdowns
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.autoExpandActiveSubmenu();
      });
    
    console.log('Sidebar initialized - isMobile:', this.isMobile, 'isSidebarOpen:', this.isSidebarOpen);
  }

  ngAfterViewInit() {
    // Double-check after view initialization
    setTimeout(() => {
      this.checkScreenSize();
      this.autoExpandActiveSubmenu();
      console.log('After view init - isMobile:', this.isMobile);
    }, 100);
  }

  ngOnDestroy() {
    // Clean up any listeners if needed
  }

  // Auto-expand dropdown that contains the current route
  autoExpandActiveSubmenu() {
    const currentUrl = this.router.url;
    const urlPath = currentUrl.split('?')[0]; // Remove query params
    const currentRoute = urlPath.split('/').pop() || urlPath; // Get last segment
    
    // Find which submenu contains the current route
    // Since template uses index per module, we use local index
    this.sideBarService.list.forEach((module: any) => {
      module.menus.forEach((item: any, index: number) => {
        if (item.hasSubmenu && item.submenu) {
          const hasActiveChild = item.submenu.some((subItem: any) => {
            // Check if current route matches submenu link
            const routeMatch = currentRoute === subItem.link || 
                               currentUrl.includes('/' + subItem.link) ||
                               currentUrl.includes(subItem.link) ||
                               currentUrl.endsWith(subItem.link);
            return routeMatch;
          });
          
          if (hasActiveChild) {
            this.activeSubMenuIndex = index;
            console.log('Auto-expanding submenu at index:', index, 'for route:', currentRoute, 'menu:', item.title);
            this.cdr.detectChanges();
            return; // Found it, no need to continue
          }
        }
      });
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  // Enhanced to handle different breakpoints with debugging
  checkScreenSize() {
    const width = window.innerWidth;
    const previousMobile = this.isMobile;
    this.isMobile = width < 992;
    
    console.log('Screen width:', width, 'isMobile:', this.isMobile);
    
    // Auto-close sidebar when switching to desktop
    if (!this.isMobile && this.isSidebarOpen) {
      this.isSidebarOpen = false;
      console.log('Auto-closing sidebar for desktop');
    }
    
    // Log state changes
    if (previousMobile !== this.isMobile) {
      console.log('Mobile state changed from', previousMobile, 'to', this.isMobile);
    }
  }

  toggleSidebar(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    // Always toggle the sidebar state
    this.isSidebarOpen = !this.isSidebarOpen;
    console.log('Sidebar toggled - isSidebarOpen:', this.isSidebarOpen, 'isMobile:', this.isMobile);
    
    // Force change detection
    this.cdr.detectChanges();
    
    // Force DOM update
    setTimeout(() => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        if (this.isSidebarOpen) {
          sidebar.classList.add('active');
        } else {
          sidebar.classList.remove('active');
        }
      }
    }, 10);
  }

  closeSidebar(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    // Always close sidebar if it's open, regardless of mobile state
    if (this.isSidebarOpen) {
      this.isSidebarOpen = false;
      console.log('Sidebar closed');
      
      // Force DOM update
      setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.classList.remove('active');
        }
      }, 10);
    }
  }

  // Method to get Font Awesome class for given icon name
  getIconClass(iconName: string): string {
    return this.iconMap[iconName] || 'fas fa-circle';
  }

  // Enhanced submenu handling
  toggleSubMenu(index: number) {
    if (this.activeSubMenuIndex === index) {
      this.activeSubMenuIndex = null;
    } else {
      this.activeSubMenuIndex = index;
    }
    console.log('Submenu toggled - activeIndex:', this.activeSubMenuIndex);
  }

  // Check if submenu is active
  isSubMenuActive(index: number): boolean {
    return this.activeSubMenuIndex === index;
  }

  // Enhanced navigation with automatic sidebar closing
  navigateToRoute(link: string, queryParams?: any) {
    console.log('Navigating to:', link, 'with params:', queryParams);
    this.router.navigate([link], { queryParams: queryParams || {} });
    this.closeSidebar();
  }

  // Check if any submenu item is active
  isParentMenuActive(submenu: any[]): boolean {
    return submenu.some(item => this.router.url.includes(item.link));
  }

  logout = async () => {
    let confirm = await swalHelper.confirmation(
      'Logout',
      'Do you really want to logout',
      'question'
    );
    if (confirm.isConfirmed) {
      this.storage.clearAll();
      this.router.navigate(['/adminLogin']);
    }
  };
}
