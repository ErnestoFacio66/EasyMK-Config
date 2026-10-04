import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { Authority } from '../../core/api.models';
import { AuthService } from '../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: AuthService;

  function setup(mode: 'tenant' | 'platform' = 'tenant') {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideNoopAnimations()],
    });
    fixture = TestBed.createComponent(LoginComponent);
    fixture.componentRef.setInput('mode', mode);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  }

  function loginAs(roles: Authority[]) {
    spyOn(authService, 'login').and.returnValue(of(undefined));
    spyOn(authService, 'hasRole').and.callFake((role) => roles.includes(role));
  }

  it('should block submission when fields are empty', () => {
    setup();
    const login = spyOn(authService, 'login');

    component.onSubmit();

    expect(component.form.invalid).toBeTrue();
    expect(login).not.toHaveBeenCalled();
  });

  it('should let a seller admin in', () => {
    setup();
    loginAs(['ADMIN']);
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    component.form.setValue({ email: 'admin@easymk.mx', password: 'x' });
    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('should refuse sellers without ADMIN and end their session', () => {
    setup();
    loginAs(['ORDERS_MANAGER']);
    const logout = spyOn(authService, 'logout');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    component.form.setValue({ email: 'ordenes@easymk.mx', password: 'x' });
    component.onSubmit();
    fixture.detectChanges();

    expect(logout).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('no tiene permisos de administrador');
  });

  it('should use the platform login in platform mode', () => {
    setup('platform');
    spyOn(authService, 'platformLogin').and.returnValue(of(undefined));
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    component.form.setValue({ email: 'staff@easymk.mx', password: 'x' });
    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith('/platform');
  });

  it('should show a message when the credentials are rejected', () => {
    setup();
    spyOn(authService, 'login').and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    component.form.setValue({ email: 'admin@easymk.mx', password: 'bad' });
    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Correo o contraseña incorrectos.');
  });
});
